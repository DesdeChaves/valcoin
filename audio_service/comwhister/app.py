"""
Serviço Python para processamento de áudio (TTS e STT) - Versão Final 2025
Usa FastAPI, Coqui TTS (voz natural), faster-whisper (STT preciso) e Jellyfish (comparação fonética)
"""
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict
import os
import hashlib
import tempfile
import shutil
from pathlib import Path
import re
import logging
import httpx
import unicodedata
import torch
import jellyfish

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Bibliotecas para TTS - gTTS
from gtts import gTTS

# Bibliotecas para STT - faster-whisper
from faster_whisper import WhisperModel

# Para conversão de áudio
from pydub import AudioSegment

# ============================================
# Inicialização dos modelos (carregam uma vez no startup)
# ============================================
logger.info("A carregar modelo Whisper (STT)...")
whisper_model = WhisperModel(
    "small",  # "base" para mais rápido, "small" para boa precisão, "medium" se tiveres GPU
    download_root="/root/.cache/whisper",
    device="cuda" if torch.cuda.is_available() else "cpu",
    compute_type="float16" if torch.cuda.is_available() else "int8"
)
logger.info("Modelo Whisper carregado com sucesso.")





app = FastAPI(title="Audio Processing Service")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Request: {request.method} {request.url}")
    response = await call_next(request)
    return response

# Configurações
AUDIO_CACHE_DIR = Path("audio_cache")
AUDIO_CACHE_DIR.mkdir(exist_ok=True)
VALCOIN_SERVER_URL = os.getenv("VALCOIN_SERVER_URL", "http://valcoin_admin_server:3001")

# ============================================
# MODELOS PYDANTIC
# ============================================
class TTSRequest(BaseModel):
    text: str
    language: str = "pt"
    voice_type: Optional[str] = "default"

class TTSResponse(BaseModel):
    audio_url: str
    text_hash: str
    cached: bool

# ============================================
# FUNÇÕES AUXILIARES - NORMALIZAÇÃO E AVALIAÇÃO COM JELLYFISH
# ============================================
def normalize_text_strict(text: str) -> str:
    text = text.strip()
    return ' '.join(text.split())

def normalize_text_lenient(text: str) -> str:
    text = unicodedata.normalize('NFD', text)
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    text = text.lower()
    text = re.sub(r'[^\w\s]', '', text)
    return ' '.join(text.split())

def analyze_text_quality(student_text: str, expected_text: str) -> Dict:
    student_clean = student_text.strip().lower()
    expected_clean = expected_text.strip().lower()

    metaphone_student = jellyfish.metaphone(student_clean)
    metaphone_expected = jellyfish.metaphone(expected_clean)
    phonetic_match = metaphone_student == metaphone_expected
    jaro_score = jellyfish.jaro_winkler_similarity(student_clean, expected_clean) * 100

    from difflib import SequenceMatcher
    content_similarity = SequenceMatcher(None, normalize_text_lenient(student_text), normalize_text_lenient(expected_text)).ratio() * 100
    exact_similarity = SequenceMatcher(None, normalize_text_strict(student_text), normalize_text_strict(expected_text)).ratio() * 100

    expected_words = normalize_text_lenient(expected_text).split()
    student_words = normalize_text_lenient(student_text).split()
    length_ratio = len(student_words) / max(len(expected_words), 1)
    length_score = 100 if 0.8 <= length_ratio <= 1.2 else max(0, 100 - abs(length_ratio - 1) * 50)
    keyword_coverage = (sum(1 for word in expected_words if word in student_words) / len(expected_words) * 100) if expected_words else 100

    if len(expected_clean) <= 3:
        if phonetic_match:
            composite_score = 100.0
            content_similarity = 100.0
        else:
            composite_score = jaro_score * 0.8 + content_similarity * 0.2
    else:
        phonetic_weight = min(0.4, len(expected_clean) / 20)
        composite_score = (
            content_similarity * 0.40 +
            exact_similarity * 0.20 +
            length_score * 0.15 +
            keyword_coverage * 0.15 +
            jaro_score * phonetic_weight
        )

    return {
        "content_similarity": round(content_similarity, 2),
        "exact_similarity": round(exact_similarity, 2),
        "jaro_winkler_similarity": round(jaro_score, 2),
        "phonetic_match": phonetic_match,
        "length_ratio": round(length_ratio, 2),
        "length_score": round(length_score, 2),
        "keyword_coverage": round(keyword_coverage, 2),
        "composite_score": round(composite_score, 2),
        "student_words_count": len(student_words),
        "expected_words_count": len(expected_words)
    }

def get_rating_from_analysis(analysis: Dict) -> int:
    score = analysis["composite_score"]
    content_sim = analysis["content_similarity"]
    if score >= 90 and content_sim >= 88:
        return 4
    elif score >= 75 and content_sim >= 70:
        return 3
    elif score >= 50 or (content_sim >= 60 and analysis["length_ratio"] >= 0.5):
        return 2
    else:
        return 1

def get_feedback_message(rating: int, analysis: Dict) -> str:
    if rating == 4:
        return "Excelente! Resposta quase perfeita."
    elif rating == 3:
        if analysis["exact_similarity"] < 85:
            return "Muito bem! Atenção a pequenos detalhes de ortografia ou pontuação."
        else:
            return "Muito bem! Resposta correta."
    elif rating == 2:
        if analysis["length_ratio"] < 0.6:
            return "Resposta incompleta. Tenta incluir mais informação."
        elif analysis["keyword_coverage"] < 60:
            return "Faltam alguns conceitos importantes. Revê o conteúdo."
        else:
            return "Resposta parcialmente correta. Continua a praticar."
    else:
        if analysis["length_ratio"] < 0.3:
            return "Resposta muito incompleta. Revê todo o conteúdo."
        else:
            return "Resposta incorreta. Estuda novamente este tópico."

# ============================================
# FUNÇÕES AUXILIARES - HASH E COMUNICAÇÃO
# ============================================
def get_text_hash(text: str) -> str:
    return hashlib.md5(text.encode('utf-8')).hexdigest()

async def save_flashcard_review(payload: dict, auth_header: str):
    logger.info(f"Enviando para o Valcoin Server: {payload}")
    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(
                f"{VALCOIN_SERVER_URL}/api/memoria/revisao",
                json=payload,
                headers={"Authorization": auth_header}
            )
            res.raise_for_status()
            return res.json()
        except httpx.RequestError as e:
            logger.error(f"Erro de conexão: {e}")
            raise HTTPException(status_code=503, detail="Erro ao conectar com Valcoin Server")
        except httpx.HTTPStatusError as e:
            logger.error(f"Erro HTTP: {e.response.status_code}")
            raise HTTPException(status_code=e.response.status_code, detail="Erro no Valcoin Server")

# ============================================
# ENDPOINTS - TEXT-TO-SPEECH (Coqui TTS - voz natural)
# ============================================
@app.post("/tts/generate", response_model=TTSResponse)
async def generate_tts(request: TTSRequest):
    try:
        text_hash = get_text_hash(request.text)
        audio_filename = f"{text_hash}.mp3"
        audio_path = AUDIO_CACHE_DIR / audio_filename
        if audio_path.exists():
            return TTSResponse(audio_url=f"/audio/{audio_filename}", text_hash=text_hash, cached=True)
        
        tts = gTTS(text=request.text, lang=request.language[:2], slow=False)
        tts.save(str(audio_path))

        return TTSResponse(audio_url=f"/audio/{audio_filename}", text_hash=text_hash, cached=False)
    except Exception as e:
        logger.error(f"Erro gTTS: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao gerar áudio: {str(e)}")
        
@app.get("/audio/{filename}")
async def get_audio(filename: str):
    audio_path = AUDIO_CACHE_DIR / filename
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Áudio não encontrado")
    return FileResponse(audio_path, media_type="audio/mpeg")

# ============================================
# ENDPOINTS - REVISÃO DE FLASHCARDS (ÁUDIO)
# ============================================
@app.post("/audio-flashcards/review/audio")
async def review_audio_flashcard(
    request: Request,
    audio: UploadFile = File(...),
    flashcard_id: str = Form(...),
    expected_text: str = Form(...),
    sub_id: str = Form(""),
    time_spent: str = Form("0"),
    language: str = "pt-PT",
    threshold: float = 75.0
):
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Authorization header em falta.")

    try:
        time_spent_int = int(time_spent)
    except ValueError:
        raise HTTPException(status_code=400, detail="time_spent deve ser inteiro.")

    temp_input = None
    temp_wav = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
            temp_input = temp_file.name
            shutil.copyfileobj(audio.file, temp_file)

        audio_segment = AudioSegment.from_file(temp_input)
        temp_wav = tempfile.mktemp(suffix=".wav")
        audio_segment.export(temp_wav, format="wav")

        segments, info = whisper_model.transcribe(
            temp_wav,
            language=language[:2],
            beam_size=5,
            best_of=5,
            temperature=0.0,
            word_timestamps=True
        )
        transcription = "".join(segment.text for segment in segments).strip()
        
        all_words = [word for segment in segments for word in segment.words]
        if all_words:
            confidence = sum(word.probability for word in all_words) / len(all_words)
        else:
            confidence = 0.0

        if not transcription:
            transcription = ""
            confidence = 0.0

        analysis = analyze_text_quality(transcription, expected_text)
        rating = get_rating_from_analysis(analysis)
        is_correct = analysis["composite_score"] >= threshold
        feedback = get_feedback_message(rating, analysis)

        review_payload = {
            "flashcard_id": flashcard_id,
            "sub_id": sub_id if sub_id else None,
            "rating": rating,
            "time_spent": time_spent_int,
        }
        await save_flashcard_review(review_payload, auth_header)

        return {
            "transcription": transcription,
            "is_correct": is_correct,
            "similarity_score": analysis["content_similarity"],
            "composite_score": analysis["composite_score"],
            "confidence_score": confidence,
            "expected_text": expected_text,
            "rating": rating,
            "feedback": feedback,
            "detailed_analysis": analysis
        }
    except Exception as e:
        logger.error(f"Erro na revisão de áudio: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro ao processar áudio: {str(e)}")
    finally:
        if temp_input and os.path.exists(temp_input):
            os.unlink(temp_input)
        if temp_wav and os.path.exists(temp_wav):
            os.unlink(temp_wav)

@app.post("/audio-flashcards/review/fonema")
async def review_audio_flashcard_with_feedback(
    request: Request,
    audio: UploadFile = File(...),
    flashcard_id: str = Form(...),
    expected_text: str = Form(...),
    sub_id: str = Form(""),
    time_spent: str = Form("0"),
    language: str = "pt-PT",
    threshold: float = 75.0
):
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Authorization header em falta.")

    try:
        time_spent_int = int(time_spent)
    except ValueError:
        raise HTTPException(status_code=400, detail="time_spent deve ser inteiro.")

    temp_input = None
    temp_wav = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
            temp_input = temp_file.name
            shutil.copyfileobj(audio.file, temp_file)

        audio_segment = AudioSegment.from_file(temp_input)
        temp_wav = tempfile.mktemp(suffix=".wav")
        audio_segment.export(temp_wav, format="wav")

        segments, info = whisper_model.transcribe(
            temp_wav,
            language=language[:2],
            beam_size=5,
            best_of=5,
            temperature=0.0,
            word_timestamps=True
        )
        transcription = "".join(segment.text for segment in segments).strip()
        
        all_words = [word for segment in segments for word in segment.words]
        if all_words:
            confidence = sum(word.probability for word in all_words) / len(all_words)
        else:
            confidence = 0.0

        if not transcription:
            transcription = ""
            confidence = 0.0

        analysis = analyze_text_quality(transcription, expected_text)
        rating = get_rating_from_analysis(analysis)

        if len(expected_text.strip()) <= 3:
            is_correct = analysis["composite_score"] >= 80
        else:
            is_correct = analysis["composite_score"] >= threshold

        content_similarity = analysis["content_similarity"]
        if content_similarity >= 80 or analysis.get("phonetic_match", False):
            feedback_message = "Bom!"
            feedback_type = "correct"
        elif content_similarity >= 50:
            feedback_message = "Quase!"
            feedback_type = "partial"
        else:
            feedback_message = "Tenta de novo!"
            feedback_type = "incorrect"

        text_hash = get_text_hash(feedback_message)
        audio_filename = f"{text_hash}.mp3"
        audio_path = AUDIO_CACHE_DIR / audio_filename
        if not audio_path.exists():
            tts = gTTS(text=feedback_message, lang=language[:2], slow=False)
            tts.save(str(audio_path))
        feedback_audio_url = f"/audio/{audio_filename}"

        review_payload = {
            "flashcard_id": flashcard_id,
            "sub_id": sub_id if sub_id else None,
            "rating": rating,
            "time_spent": time_spent_int,
        }
        await save_flashcard_review(review_payload, auth_header)

        return {
            "transcription": transcription,
            "is_correct": is_correct,
            "similarity_score": analysis["content_similarity"],
            "composite_score": analysis["composite_score"],
            "confidence_score": confidence,
            "expected_text": expected_text,
            "rating": rating,
            "detailed_analysis": analysis,
            "feedback_type": feedback_type,
            "feedback_message": feedback_message,
            "feedback_audio_url": feedback_audio_url
        }
    except Exception as e:
        logger.error(f"Erro na revisão de fonema: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro ao processar áudio: {str(e)}")
    finally:
        if temp_input and os.path.exists(temp_input):
            os.unlink(temp_input)
        if temp_wav and os.path.exists(temp_wav):
            os.unlink(temp_wav)

@app.post("/audio-flashcards/review/spelling")
async def review_spelling_flashcard(
    request: Request,
    audio: UploadFile = File(...),
    flashcard_id: str = Form(...),
    expected_text: str = Form(...),
    sub_id: str = Form(""),
    time_spent: str = Form("0"),
    language: str = "pt-PT",
    threshold: float = 75.0
):
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Authorization header em falta.")

    try:
        time_spent_int = int(time_spent)
    except ValueError:
        raise HTTPException(status_code=400, detail="time_spent deve ser inteiro.")

    temp_input = None
    temp_wav = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
            temp_input = temp_file.name
            shutil.copyfileobj(audio.file, temp_file)

        audio_segment = AudioSegment.from_file(temp_input)
        temp_wav = tempfile.mktemp(suffix=".wav")
        audio_segment.export(temp_wav, format="wav")

        segments, info = whisper_model.transcribe(
            temp_wav,
            language=language[:2],
            beam_size=5,
            best_of=5,
            temperature=0.0,
            word_timestamps=True
        )
        transcription = "".join(segment.text for segment in segments).strip()
        
        all_words = [word for segment in segments for word in segment.words]
        if all_words:
            confidence = sum(word.probability for word in all_words) / len(all_words)
        else:
            confidence = 0.0

        if not transcription:
            transcription = ""
            confidence = 0.0

        # Spelling-specific logic
        normalized_transcription = normalize_text_lenient(transcription)
        if " " not in normalized_transcription: # If it's a single word
            normalized_transcription = " ".join(list(normalized_transcription))

        analysis = analyze_text_quality(normalized_transcription, expected_text)
        rating = get_rating_from_analysis(analysis)
        is_correct = analysis["composite_score"] >= threshold

        content_similarity = analysis["content_similarity"]
        if content_similarity >= 80:
            feedback_message = "Bom!"
            feedback_type = "correct"
        elif content_similarity >= 50:
            feedback_message = "Quase!"
            feedback_type = "partial"
        else:
            feedback_message = "Tenta de novo!"
            feedback_type = "incorrect"

        text_hash = get_text_hash(feedback_message)
        audio_filename = f"{text_hash}.mp3"
        audio_path = AUDIO_CACHE_DIR / audio_filename
        if not audio_path.exists():
            tts = gTTS(text=feedback_message, lang=language[:2], slow=False)
            tts.save(str(audio_path))
        feedback_audio_url = f"/audio/{audio_filename}"

        review_payload = {
            "flashcard_id": flashcard_id,
            "sub_id": sub_id if sub_id else None,
            "rating": rating,
            "time_spent": time_spent_int,
        }
        await save_flashcard_review(review_payload, auth_header)

        return {
            "transcription": transcription,
            "is_correct": is_correct,
            "similarity_score": analysis["content_similarity"],
            "composite_score": analysis["composite_score"],
            "confidence_score": confidence,
            "expected_text": expected_text,
            "rating": rating,
            "detailed_analysis": analysis,
            "feedback_type": feedback_type,
            "feedback_message": feedback_message,
            "feedback_audio_url": feedback_audio_url
        }
    except Exception as e:
        logger.error(f"Erro na revisão de spelling: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro ao processar áudio: {str(e)}")
    finally:
        if temp_input and os.path.exists(temp_input):
            os.unlink(temp_input)
        if temp_wav and os.path.exists(temp_wav):
            os.unlink(temp_wav)

# ============================================
# ENDPOINT - REVISÃO DE TEXTO (Ditado)
# ============================================
@app.post("/audio-flashcards/review/text")
async def review_text_flashcard(
    request: Request,
    flashcard_id: str = Form(...),
    student_text: str = Form(...),
    expected_text: str = Form(...),
    sub_id: str = Form(""),
    time_spent: str = Form("0"),
    threshold: float = 75.0
):
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Authorization header em falta.")

    try:
        time_spent_int = int(time_spent)
    except ValueError:
        raise HTTPException(status_code=400, detail="time_spent deve ser inteiro.")

    try:
        analysis = analyze_text_quality(student_text, expected_text)
        rating = get_rating_from_analysis(analysis)
        is_correct = analysis["composite_score"] >= threshold
        feedback = get_feedback_message(rating, analysis)

        review_payload = {
            "flashcard_id": flashcard_id,
            "sub_id": sub_id if sub_id else None,
            "rating": rating,
            "time_spent": time_spent_int,
        }
        await save_flashcard_review(review_payload, auth_header)

        return {
            "student_text": student_text,
            "expected_text": expected_text,
            "is_correct": is_correct,
            "similarity_score": analysis["content_similarity"],
            "composite_score": analysis["composite_score"],
            "rating": rating,
            "feedback": feedback,
            "detailed_analysis": analysis
        }
    except Exception as e:
        logger.error(f"Erro na revisão de texto: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro ao processar texto: {str(e)}")

# ============================================
# ENDPOINTS DE UTILIDADE
# ============================================
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Audio Processing Service", "version": "3.1.0 (gTTS + Whisper + Jellyfish)"}

@app.delete("/cache/clear")
async def clear_cache():
    count = 0
    for file in AUDIO_CACHE_DIR.glob("*.mp3"):
        file.unlink()
        count += 1
    return {"success": True, "files_deleted": count}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
