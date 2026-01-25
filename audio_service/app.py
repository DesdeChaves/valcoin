"""
Serviço Python para processamento de áudio (TTS e STT)
OTIMIZADO PARA CRIANÇAS - Com análise fonética avançada
Versão 6.0 - Whisper + Phonemizer + Análise acústica
"""
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Request, Query
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
import jellyfish
import numpy as np
import pandas as pd
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import JSONB  # <--- Esta é a linha correta
from typing import Optional
from sqlalchemy import Numeric 

# === FIM NOVO ===


# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Bibliotecas para TTS - gTTS
from gtts import gTTS

# Bibliotecas para STT - Whisper (mais robusto que Google STT)
import torch
from faster_whisper import WhisperModel

# Para conversão e análise de áudio
from pydub import AudioSegment
from pydub.effects import normalize as pydub_normalize
import librosa

from difflib import SequenceMatcher

# G2P - Phonemizer
try:
    from phonemizer import phonemize
    from phonemizer.backend import EspeakBackend
    G2P_AVAILABLE = True
    logger.info("✅ Phonemizer carregado com sucesso!")
except Exception as e:
    logger.warning(f"⚠️ Phonemizer não disponível: {e}")
    G2P_AVAILABLE = False

# ============================================
# Inicialização do modelo Whisper (carrega uma vez no startup)
# ============================================
logger.info("🔄 A carregar modelo Whisper (STT)...")
try:
    whisper_model = WhisperModel(
        "small",  # small = bom equilíbrio velocidade/precisão
        download_root="/root/.cache/whisper",
        device="cuda" if torch.cuda.is_available() else "cpu",
        compute_type="float16" if torch.cuda.is_available() else "int8"
    )
    logger.info("✅ Modelo Whisper carregado com sucesso.")
    WHISPER_AVAILABLE = True
except Exception as e:
    logger.error(f"❌ Erro ao carregar Whisper: {e}")
    whisper_model = None
    WHISPER_AVAILABLE = False

app = FastAPI(title="Audio Processing Service - Phoneme Edition + Qualidade")




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

# === NOVO: CONFIGURAÇÃO DA BASE DE DADOS ===
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL não definida no environment")

engine = create_engine(DATABASE_URL)
Base = declarative_base()
SessionLocal = sessionmaker(bind=engine)

from sqlalchemy import Column, Integer, String, Float, Numeric, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class AvaliacaoAluno(Base):
    __tablename__ = "avaliacoes_alunos"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    ano_letivo = Column(String, nullable=False)
    periodo = Column(String, nullable=False)
    ano = Column(String, nullable=False)
    turma = Column(String, nullable=False)
    disciplina = Column(String, nullable=False)
    total_alunos = Column(Integer)
    total_positivos = Column(Integer)
    percent_positivos = Column(Float)
    total_negativos = Column(Integer)
    percent_negativos = Column(Float)
    ciclo = Column(String, nullable=False)
    classificacoes = Column(JSONB, nullable=False)
    sheet_name = Column(String)
    created_at = Column(DateTime, server_default=func.now())
    media = Column(Numeric(4, 2), nullable=True)  # ⬅️ ESTE CAMPO É ESSENCIAL

# Cria a tabela se ainda não existir
Base.metadata.create_all(engine)

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
# FUNÇÕES AUXILIARES - CONVERSÃO FONÉTICA (G2P)
# ============================================
def text_to_phonemes(text: str) -> str:
    """
    Converte texto em fonemas usando Phonemizer (espeak-ng)
    """
    if not text or not text.strip():
        return ""
    
    if not G2P_AVAILABLE:
        return ""
    
    try:
        text_clean = text.strip().lower()
        
        phonemes = phonemize(
            text_clean,
            language='pt',
            backend='espeak',
            strip=True,
            preserve_punctuation=False,
            with_stress=False
        )
        
        phonemes_clean = phonemes.strip()
        logger.info(f"[G2P] '{text_clean}' -> '{phonemes_clean}'")
        return phonemes_clean
        
    except Exception as e:
        logger.error(f"[G2P] Erro: {e}")
        return ""

def compare_phonemes(student_text: str, expected_text: str) -> Dict:
    """
    Compara textos pela representação fonética
    """
    student_phonemes = text_to_phonemes(student_text)
    expected_phonemes = text_to_phonemes(expected_text)
    
    if not student_phonemes or not expected_phonemes:
        return {
            "phonetic_similarity": 0.0,
            "student_phonemes": student_phonemes,
            "expected_phonemes": expected_phonemes,
            "g2p_available": False
        }
    
    similarity = SequenceMatcher(None, student_phonemes, expected_phonemes).ratio() * 100
    exact_match = student_phonemes == expected_phonemes
    
    logger.info(f"[G2P] Esperado: '{expected_phonemes}', Recebido: '{student_phonemes}', Sim: {similarity:.1f}%")
    
    return {
        "phonetic_similarity": round(similarity, 2),
        "phonetic_exact_match": exact_match,
        "student_phonemes": student_phonemes,
        "expected_phonemes": expected_phonemes,
        "g2p_available": True
    }

# ============================================
# FUNÇÕES AUXILIARES - ANÁLISE ACÚSTICA
# ============================================
def analyze_audio_quality(audio_path: str) -> Dict:
    """
    Análise acústica básica do áudio
    Detecta problemas antes do STT
    """
    try:
        y, sr = librosa.load(audio_path, sr=16000)
        
        # 1. Energia do sinal
        rms_energy = np.mean(librosa.feature.rms(y=y))
        has_voice = rms_energy > 0.01
        
        # 2. Duração
        duration = librosa.get_duration(y=y, sr=sr)
        
        # 3. Taxa de zero-crossing (diferencia voz de ruído)
        zcr = np.mean(librosa.feature.zero_crossing_rate(y))
        
        # 4. Espectrograma - distribuição de energia
        spec = np.abs(librosa.stft(y))
        spectral_centroid = np.mean(librosa.feature.spectral_centroid(S=spec))
        
        logger.info(f"[AUDIO] Energia: {rms_energy:.4f}, Duração: {duration:.2f}s, ZCR: {zcr:.4f}")
        
        return {
            "has_voice": bool(has_voice),
            "energy": float(rms_energy),
            "duration_seconds": float(duration),
            "zero_crossing_rate": float(zcr),
            "spectral_centroid": float(spectral_centroid),
            "quality_ok": bool(has_voice and duration > 0.2 and duration < 10.0)
        }
        
    except Exception as e:
        logger.error(f"[AUDIO] Erro na análise acústica: {e}")
        return {"quality_ok": False, "error": str(e)}

def enhance_audio_for_speech_recognition(audio_segment: AudioSegment) -> AudioSegment:
    """
    Melhora qualidade do áudio para reconhecimento
    Otimizado para crianças e fonemas curtos
    """
    logger.info(f"[ENHANCE] Original: dBFS={audio_segment.dBFS:.1f}, dur={len(audio_segment)}ms")
    
    # 1. Normalizar volume
    audio_segment = pydub_normalize(audio_segment)
    
    # 2. Remover silêncios
    audio_segment = audio_segment.strip_silence(
        silence_len=200,
        silence_thresh=-50,
        padding=100
    )
    
    # 3. Aumentar volume se necessário
    if audio_segment.dBFS < -15:
        gain = -15 - audio_segment.dBFS
        audio_segment = audio_segment.apply_gain(gain)
        logger.info(f"[ENHANCE] Volume aumentado em {gain:.1f}dB")
    
    # 4. Se muito curto, repetir (IMPORTANTE para fonemas!)
    if len(audio_segment) < 800:
        original_dur = len(audio_segment)
        silence = AudioSegment.silent(duration=100)
        audio_segment = audio_segment + silence + audio_segment + silence + audio_segment
        logger.info(f"[ENHANCE] ⚠️ Áudio curto ({original_dur}ms) REPETIDO 3x -> {len(audio_segment)}ms")
    
    # 5. Formato ideal
    audio_segment = audio_segment.set_frame_rate(16000)
    audio_segment = audio_segment.set_channels(1)
    
    logger.info(f"[ENHANCE] Final: dBFS={audio_segment.dBFS:.1f}, dur={len(audio_segment)}ms")
    
    return audio_segment

# ============================================
# FUNÇÕES AUXILIARES - NORMALIZAÇÃO E AVALIAÇÃO
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

def analyze_text_quality(student_text: str, expected_text: str, use_phonetic: bool = False) -> Dict:
    """
    Análise completa da qualidade da resposta
    Suporta análise fonética via G2P
    """
    student_clean = student_text.strip().lower()
    expected_clean = expected_text.strip().lower()
    
    # Proteção contra texto vazio
    if not student_clean:
        return {
            "content_similarity": 0.0,
            "exact_similarity": 0.0,
            "jaro_winkler_similarity": 0.0,
            "phonetic_match": False,
            "phonetic_similarity": 0.0,
            "length_ratio": 0.0,
            "length_score": 0.0,
            "keyword_coverage": 0.0,
            "composite_score": 0.0,
            "student_words_count": 0,
            "expected_words_count": len(expected_clean.split()),
            "g2p_used": False
        }

    # Análise fonética tradicional (jellyfish)
    metaphone_student = jellyfish.metaphone(student_clean)
    metaphone_expected = jellyfish.metaphone(expected_clean)
    phonetic_match = metaphone_student == metaphone_expected
    jaro_score = jellyfish.jaro_winkler_similarity(student_clean, expected_clean) * 100

    # Similaridades textuais
    content_similarity = SequenceMatcher(None, normalize_text_lenient(student_text), normalize_text_lenient(expected_text)).ratio() * 100
    exact_similarity = SequenceMatcher(None, normalize_text_strict(student_text), normalize_text_strict(expected_text)).ratio() * 100

    expected_words = normalize_text_lenient(expected_text).split()
    student_words = normalize_text_lenient(student_text).split()
    length_ratio = len(student_words) / max(len(expected_words), 1)
    length_score = 100 if 0.8 <= length_ratio <= 1.2 else max(0, 100 - abs(length_ratio - 1) * 50)
    keyword_coverage = (sum(1 for word in expected_words if word in student_words) / len(expected_words) * 100) if expected_words else 100

    # ANÁLISE FONÉTICA AVANÇADA (G2P)
    phonetic_similarity = 0.0
    g2p_used = False
    
    if use_phonetic and G2P_AVAILABLE:
        phonetic_analysis = compare_phonemes(student_text, expected_text)
        if phonetic_analysis.get("g2p_available", False):
            phonetic_similarity = phonetic_analysis["phonetic_similarity"]
            g2p_used = True
            
            if phonetic_analysis.get("phonetic_exact_match", False):
                phonetic_match = True
                phonetic_similarity = 100.0

    # CÁLCULO DO SCORE COMPOSTO
    if len(expected_clean) <= 3:
        # Fonemas curtos: priorizar análise fonética
        if phonetic_match:
            composite_score = 100.0
            content_similarity = 100.0
        elif g2p_used and phonetic_similarity >= 80:
            composite_score = phonetic_similarity
        elif jaro_score >= 70:
            composite_score = jaro_score
        else:
            if g2p_used:
                composite_score = phonetic_similarity * 0.5 + jaro_score * 0.3 + content_similarity * 0.2
            else:
                composite_score = jaro_score * 0.8 + content_similarity * 0.2
    else:
        # Textos longos: combinação balanceada
        if g2p_used:
            composite_score = (
                content_similarity * 0.30 +
                exact_similarity * 0.15 +
                length_score * 0.10 +
                keyword_coverage * 0.10 +
                jaro_score * 0.15 +
                phonetic_similarity * 0.20
            )
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
        "phonetic_similarity": round(phonetic_similarity, 2),
        "length_ratio": round(length_ratio, 2),
        "length_score": round(length_score, 2),
        "keyword_coverage": round(keyword_coverage, 2),
        "composite_score": round(composite_score, 2),
        "student_words_count": len(student_words),
        "expected_words_count": len(expected_words),
        "g2p_used": g2p_used
    }

def get_rating_from_analysis(analysis: Dict) -> int:
    """
    Converte score em rating (1-4)
    """
    score = analysis["composite_score"]
    content_sim = analysis["content_similarity"]
    
    # Bonus se G2P confirmar
    if analysis.get("g2p_used", False) and analysis.get("phonetic_similarity", 0) >= 90:
        return 4
    
    if score >= 90 and content_sim >= 88:
        return 4
    elif score >= 75 and content_sim >= 70:
        return 3
    elif score >= 50 or (content_sim >= 60 and analysis["length_ratio"] >= 0.5):
        return 2
    else:
        return 1

def get_feedback_message(rating: int, analysis: Dict) -> str:
    """
    Mensagem de feedback baseada no rating
    """
    if rating == 4:
        return "Excelente! Resposta quase perfeita."
    elif rating == 3:
        if analysis["exact_similarity"] < 85:
            return "Muito bem! Atenção a pequenos detalhes."
        else:
            return "Muito bem! Resposta correta."
    elif rating == 2:
        if analysis["length_ratio"] < 0.6:
            return "Resposta incompleta. Tenta incluir mais."
        elif analysis["keyword_coverage"] < 60:
            return "Faltam alguns conceitos. Revê o conteúdo."
        else:
            return "Resposta parcial. Continua a praticar."
    else:
        if analysis["length_ratio"] < 0.3:
            return "Resposta muito incompleta."
        else:
            return "Resposta incorreta. Estuda novamente."

# ============================================
# FUNÇÕES AUXILIARES - HASH E COMUNICAÇÃO
# ============================================
def get_text_hash(text: str) -> str:
    return hashlib.md5(text.encode('utf-8')).hexdigest()

async def save_flashcard_review(payload: dict, auth_header: str):
    """Envia a revisão para o valcoin_server"""
    logger.info(f"[VALCOIN] Enviando: {payload}")
    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(
                f"{VALCOIN_SERVER_URL}/api/memoria/revisao",
                json=payload,
                headers={"Authorization": auth_header}
            )
            res.raise_for_status()
            logger.info(f"[VALCOIN] OK: {res.status_code}")
            return res.json()
        except httpx.RequestError as e:
            logger.error(f"[VALCOIN] Erro de conexão: {e}")
            raise HTTPException(status_code=503, detail=f"Erro ao conectar: {e}")
        except httpx.HTTPStatusError as e:
            logger.error(f"[VALCOIN] Erro HTTP: {e.response.status_code}")
            raise HTTPException(status_code=e.response.status_code, detail=f"Erro: {e.response.text}")

# ============================================
# ENDPOINTS - TEXT-TO-SPEECH (TTS)
# ============================================
@app.post("/tts/generate", response_model=TTSResponse)
async def generate_tts(request: TTSRequest):
    try:
        text_hash = get_text_hash(request.text)
        audio_filename = f"{text_hash}.mp3"
        audio_path = AUDIO_CACHE_DIR / audio_filename
        
        if audio_path.exists():
            return TTSResponse(audio_url=f"/audio/{audio_filename}", text_hash=text_hash, cached=True)
        
        # Para fonemas, falar mais devagar
        slow = len(request.text.strip()) <= 3
        tts = gTTS(text=request.text, lang=request.language, slow=slow)
        tts.save(str(audio_path))
        
        return TTSResponse(audio_url=f"/audio/{audio_filename}", text_hash=text_hash, cached=False)
    except Exception as e:
        logger.error(f"[TTS] Erro: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao gerar TTS: {str(e)}")

@app.get("/audio/{filename}")
async def get_audio(filename: str):
    audio_path = AUDIO_CACHE_DIR / filename
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Áudio não encontrado")
    return FileResponse(audio_path, media_type="audio/mpeg")

# ============================================
# ENDPOINTS - REVISÃO DE FLASHCARDS (ÁUDIO)
# ============================================
@app.post("/audio-flashcards/review/fonema")
async def review_audio_flashcard_with_feedback(
    request: Request,
    audio: UploadFile = File(...),
    flashcard_id: str = Form(...),
    expected_text: str = Form(...),
    sub_id: str = Form(""),
    time_spent: str = Form("0"),
    language: str = "pt",
    threshold: float = 60.0
):
    """
    Endpoint otimizado para revisão de FONEMAS
    Usa Whisper + Phonemizer + Análise acústica
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Authorization required")
    
    try:
        time_spent_int = int(time_spent)
    except ValueError:
        raise HTTPException(status_code=400, detail="time_spent inválido")
    
    logger.info(f"[FONEMA] 🎯 ID: {flashcard_id}, Esperado: '{expected_text}'")
    
    temp_input = None
    temp_wav = None
    
    try:
        # 1. Salvar áudio
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
            temp_input = temp_file.name
            shutil.copyfileobj(audio.file, temp_file)
        
        # 2. Processar áudio
        audio_segment = AudioSegment.from_file(temp_input)
        logger.info(f"[FONEMA] 📊 Original: {audio_segment.dBFS:.1f}dB, {len(audio_segment)}ms")
        
        audio_segment = enhance_audio_for_speech_recognition(audio_segment)
        
        temp_wav = tempfile.mktemp(suffix=".wav")
        audio_segment.export(temp_wav, format="wav")
        
        # 3. Análise acústica (NOVO!)
        acoustic_info = analyze_audio_quality(temp_wav)
        
        if not acoustic_info.get("quality_ok", False):
            logger.warning(f"[FONEMA] ⚠️ Qualidade baixa: {acoustic_info}")
            
            # Se não tem voz, retornar erro específico
            if not acoustic_info.get("has_voice", False):
                feedback_msg = "Não consigo ouvir nada. Fala mais perto do microfone!"
                text_hash = get_text_hash(feedback_msg)
                audio_filename = f"{text_hash}.mp3"
                audio_path = AUDIO_CACHE_DIR / audio_filename
                
                if not audio_path.exists():
                    tts = gTTS(text=feedback_msg, lang=language, slow=True)
                    tts.save(str(audio_path))
                
                await save_flashcard_review({
                    "flashcard_id": flashcard_id,
                    "sub_id": sub_id or None,
                    "rating": 1,
                    "time_spent": time_spent_int
                }, auth_header)
                
                return {
                    "transcription": "",
                    "is_correct": False,
                    "similarity_score": 0.0,
                    "composite_score": 0.0,
                    "confidence_score": 0.0,
                    "expected_text": expected_text,
                    "rating": 1,
                    "feedback_type": "no_audio",
                    "feedback_message": feedback_msg,
                    "feedback_audio_url": f"/audio/{audio_filename}",
                    "acoustic_analysis": acoustic_info
                }
        
        # 4. Transcrição com Whisper
        transcription = ""
        confidence = 0.0
        
        if WHISPER_AVAILABLE:
            logger.info("[FONEMA] 🎤 Usando Whisper...")
            segments, info = whisper_model.transcribe(
                temp_wav,
                language=language,
                beam_size=5,
                best_of=5,
                temperature=0.0,
                word_timestamps=True
            )
            
            transcription = "".join(segment.text for segment in segments).strip()
            
            all_words = [word for segment in segments for word in getattr(segment, 'words', [])]
            if all_words:
                confidence = sum(getattr(word, 'probability', 0.5) for word in all_words) / len(all_words)
            else:
                confidence = 0.5
            
            logger.info(f"[FONEMA] Whisper: '{transcription}' (conf: {confidence:.2f})")
        
        # Se Whisper falhou ou não disponível, retornar erro
        if not transcription:
            logger.warning("[FONEMA] ❌ STT falhou")
            
            feedback_msg = "Não consegui entender. Tenta falar mais devagar!"
            text_hash = get_text_hash(feedback_msg)
            audio_filename = f"{text_hash}.mp3"
            audio_path = AUDIO_CACHE_DIR / audio_filename
            
            if not audio_path.exists():
                tts = gTTS(text=feedback_msg, lang=language, slow=True)
                tts.save(str(audio_path))
            
            await save_flashcard_review({
                "flashcard_id": flashcard_id,
                "sub_id": sub_id or None,
                "rating": 1,
                "time_spent": time_spent_int
            }, auth_header)
            
            return {
                "transcription": "",
                "is_correct": False,
                "similarity_score": 0.0,
                "composite_score": 0.0,
                "confidence_score": 0.0,
                "expected_text": expected_text,
                "rating": 1,
                "feedback_type": "stt_failed",
                "feedback_message": feedback_msg,
                "feedback_audio_url": f"/audio/{audio_filename}",
                "acoustic_analysis": acoustic_info
            }
        
        # 5. Análise com G2P
        logger.info("[FONEMA] 🧬 Análise fonética...")
        analysis = analyze_text_quality(transcription, expected_text, use_phonetic=True)
        
        # 6. Lógica de avaliação para fonemas curtos
        if len(expected_text.strip()) <= 3:
            g2p_sim = analysis.get("phonetic_similarity", 0)
            
            is_correct = (
                analysis["phonetic_match"] or
                (analysis.get("g2p_used", False) and g2p_sim >= 75) or
                analysis["jaro_winkler_similarity"] >= 70 or
                analysis["content_similarity"] >= 60
            )
            
            logger.info(f"[FONEMA] Lógica curta: phonetic={analysis['phonetic_match']}, " +
                       f"g2p={g2p_sim}, jaro={analysis['jaro_winkler_similarity']}, " +
                       f"content={analysis['content_similarity']} -> {is_correct}")
        else:
            is_correct = analysis["composite_score"] >= threshold
        
        # 7. Rating e Feedback
        if is_correct:
            rating = 4 if analysis["composite_score"] >= 90 else 3
            feedback_msg = "Muito bem! 🎉"
            feedback_type = "correct"
        elif analysis["composite_score"] >= 40:
            rating = 2
            feedback_msg = "Quase lá! Tenta outra vez! 😊"
            feedback_type = "partial"
        else:
            rating = 1
            feedback_msg = "Vamos tentar de novo! 💪"
            feedback_type = "incorrect"
        
        logger.info(f"[FONEMA] ✅ Rating={rating}, Feedback='{feedback_msg}'")
        
        # 8. Gerar TTS do feedback
        text_hash = get_text_hash(feedback_msg)
        audio_filename = f"{text_hash}.mp3"
        audio_path = AUDIO_CACHE_DIR / audio_filename
        
        if not audio_path.exists():
            tts = gTTS(text=feedback_msg, lang=language, slow=False)
            tts.save(str(audio_path))
        
        # 9. Salvar revisão
        await save_flashcard_review({
            "flashcard_id": flashcard_id,
            "sub_id": sub_id or None,
            "rating": rating,
            "time_spent": time_spent_int
        }, auth_header)
        
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
            "feedback_message": feedback_msg,
            "feedback_audio_url": f"/audio/{audio_filename}",
            "acoustic_analysis": acoustic_info
        }
        
    except Exception as e:
        logger.error(f"[FONEMA] ❌ Erro: {e}", exc_info=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")
    finally:
        if temp_input and os.path.exists(temp_input):
            os.unlink(temp_input)
        if temp_wav and os.path.exists(temp_wav):
            os.unlink(temp_wav)

# ============================================
# OUTROS ENDPOINTS (simplificados)
# ============================================
@app.post("/audio-flashcards/review/spelling")
async def review_spelling_flashcard(
    request: Request,
    audio: UploadFile = File(...),
    flashcard_id: str = Form(...),
    expected_text: str = Form(...),
    sub_id: str = Form(""),
    time_spent: str = Form("0"),
    language: str = "pt",
    threshold: float = 75.0
):
    """
    Endpoint para revisão de SPELLING (soletração)
    Criança soletra letra por letra: "b-o-l-a"
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Authorization required")
    
    try:
        time_spent_int = int(time_spent)
    except ValueError:
        raise HTTPException(status_code=400, detail="time_spent inválido")
    
    logger.info(f"[SPELLING] 🔤 ID: {flashcard_id}, Esperado: '{expected_text}'")
    
    temp_input = None
    temp_wav = None
    
    try:
        # 1. Salvar áudio
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
            temp_input = temp_file.name
            shutil.copyfileobj(audio.file, temp_file)
        
        # 2. Processar áudio
        audio_segment = AudioSegment.from_file(temp_input)
        audio_segment = enhance_audio_for_speech_recognition(audio_segment)
        
        temp_wav = tempfile.mktemp(suffix=".wav")
        audio_segment.export(temp_wav, format="wav")
        
        # 3. Análise acústica
        acoustic_info = analyze_audio_quality(temp_wav)
        
        if not acoustic_info.get("has_voice", False):
            logger.warning("[SPELLING] ⚠️ Sem voz detectada")
            
            feedback_msg = "Não consigo ouvir. Fala mais alto!"
            text_hash = get_text_hash(feedback_msg)
            audio_filename = f"{text_hash}.mp3"
            audio_path = AUDIO_CACHE_DIR / audio_filename
            
            if not audio_path.exists():
                tts = gTTS(text=feedback_msg, lang=language, slow=True)
                tts.save(str(audio_path))
            
            await save_flashcard_review({
                "flashcard_id": flashcard_id,
                "sub_id": sub_id or None,
                "rating": 1,
                "time_spent": time_spent_int
            }, auth_header)
            
            return {
                "transcription": "",
                "is_correct": False,
                "similarity_score": 0.0,
                "composite_score": 0.0,
                "confidence_score": 0.0,
                "expected_text": expected_text,
                "rating": 1,
                "feedback_type": "no_audio",
                "feedback_message": feedback_msg,
                "feedback_audio_url": f"/audio/{audio_filename}"
            }
        
        # 4. Transcrição com Whisper
        transcription = ""
        confidence = 0.0
        
        if WHISPER_AVAILABLE:
            logger.info("[SPELLING] 🎤 Transcrevendo com Whisper...")
            segments, info = whisper_model.transcribe(
                temp_wav,
                language=language,
                beam_size=5,
                best_of=5,
                temperature=0.0,
                word_timestamps=True
            )
            
            transcription = "".join(segment.text for segment in segments).strip()
            
            all_words = [word for segment in segments for word in getattr(segment, 'words', [])]
            if all_words:
                confidence = sum(getattr(word, 'probability', 0.5) for word in all_words) / len(all_words)
            else:
                confidence = 0.5
            
            logger.info(f"[SPELLING] Transcrição: '{transcription}'")
        
        if not transcription:
            logger.warning("[SPELLING] ❌ STT falhou")
            
            feedback_msg = "Não consegui entender. Soletra mais devagar!"
            text_hash = get_text_hash(feedback_msg)
            audio_filename = f"{text_hash}.mp3"
            audio_path = AUDIO_CACHE_DIR / audio_filename
            
            if not audio_path.exists():
                tts = gTTS(text=feedback_msg, lang=language, slow=True)
                tts.save(str(audio_path))
            
            await save_flashcard_review({
                "flashcard_id": flashcard_id,
                "sub_id": sub_id or None,
                "rating": 1,
                "time_spent": time_spent_int
            }, auth_header)
            
            return {
                "transcription": "",
                "is_correct": False,
                "similarity_score": 0.0,
                "composite_score": 0.0,
                "confidence_score": 0.0,
                "expected_text": expected_text,
                "rating": 1,
                "feedback_type": "stt_failed",
                "feedback_message": feedback_msg,
                "feedback_audio_url": f"/audio/{audio_filename}"
            }
        
        # 5. Processar transcrição para spelling
        # Se criança disse "b o l a", normalizar para "bola"
        normalized_transcription = normalize_text_lenient(transcription)
        
        # Se não tem espaços (palavra completa), separar em letras
        if " " not in normalized_transcription and len(normalized_transcription) > 1:
            # Criança disse palavra completa, separar: "bola" -> "b o l a"
            normalized_transcription = " ".join(list(normalized_transcription))
            logger.info(f"[SPELLING] Separado em letras: '{normalized_transcription}'")
        
        # 6. Análise com G2P
        analysis = analyze_text_quality(normalized_transcription, expected_text, use_phonetic=True)
        
        # 7. Avaliar
        rating = get_rating_from_analysis(analysis)
        is_correct = analysis["composite_score"] >= threshold
        
        # 8. Feedback específico para spelling
        content_sim = analysis["content_similarity"]
        
        if content_sim >= 80:
            feedback_msg = "Muito bem! Soletrado corretamente! 🎉"
            feedback_type = "correct"
        elif content_sim >= 50:
            feedback_msg = "Quase! Algumas letras estão certas. 😊"
            feedback_type = "partial"
        else:
            feedback_msg = "Vamos tentar de novo! 💪"
            feedback_type = "incorrect"
        
        logger.info(f"[SPELLING] Rating={rating}, Feedback='{feedback_msg}'")
        
        # 9. Gerar TTS do feedback
        text_hash = get_text_hash(feedback_msg)
        audio_filename = f"{text_hash}.mp3"
        audio_path = AUDIO_CACHE_DIR / audio_filename
        
        if not audio_path.exists():
            tts = gTTS(text=feedback_msg, lang=language, slow=False)
            tts.save(str(audio_path))
        
        # 10. Salvar revisão
        await save_flashcard_review({
            "flashcard_id": flashcard_id,
            "sub_id": sub_id or None,
            "rating": rating,
            "time_spent": time_spent_int
        }, auth_header)
        
        return {
            "transcription": transcription,
            "normalized_transcription": normalized_transcription,
            "is_correct": is_correct,
            "similarity_score": analysis["content_similarity"],
            "composite_score": analysis["composite_score"],
            "confidence_score": confidence,
            "expected_text": expected_text,
            "rating": rating,
            "detailed_analysis": analysis,
            "feedback_type": feedback_type,
            "feedback_message": feedback_msg,
            "feedback_audio_url": f"/audio/{audio_filename}",
            "acoustic_analysis": acoustic_info
        }
        
    except Exception as e:
        logger.error(f"[SPELLING] ❌ Erro: {e}", exc_info=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")
    finally:
        if temp_input and os.path.exists(temp_input):
            os.unlink(temp_input)
        if temp_wav and os.path.exists(temp_wav):
            os.unlink(temp_wav)

@app.post("/audio-flashcards/review/audio")
async def review_audio_flashcard(
    request: Request,
    audio: UploadFile = File(...),
    flashcard_id: str = Form(...),
    expected_text: str = Form(...),
    sub_id: str = Form(""),
    time_spent: str = Form("0"),
    language: str = "pt",
    threshold: float = 75.0
):
    """
    Endpoint genérico para revisão de áudio
    Para frases completas, perguntas, etc.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Authorization required")
    
    try:
        time_spent_int = int(time_spent)
    except ValueError:
        raise HTTPException(status_code=400, detail="time_spent inválido")
    
    logger.info(f"[AUDIO] 🎤 ID: {flashcard_id}, Esperado: '{expected_text}'")
    
    temp_input = None
    temp_wav = None
    
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
            temp_input = temp_file.name
            shutil.copyfileobj(audio.file, temp_file)
        
        audio_segment = AudioSegment.from_file(temp_input)
        audio_segment = enhance_audio_for_speech_recognition(audio_segment)
        
        temp_wav = tempfile.mktemp(suffix=".wav")
        audio_segment.export(temp_wav, format="wav")
        
        # Transcrição
        transcription = ""
        confidence = 0.0
        
        if WHISPER_AVAILABLE:
            segments, info = whisper_model.transcribe(
                temp_wav,
                language=language,
                beam_size=5,
                best_of=5,
                temperature=0.0
            )
            
            transcription = "".join(segment.text for segment in segments).strip()
            
            all_words = [word for segment in segments for word in getattr(segment, 'words', [])]
            if all_words:
                confidence = sum(getattr(word, 'probability', 0.5) for word in all_words) / len(all_words)
            else:
                confidence = 0.5
        
        if not transcription:
            transcription = ""
            confidence = 0.0
        
        # Análise
        analysis = analyze_text_quality(transcription, expected_text, use_phonetic=False)
        rating = get_rating_from_analysis(analysis)
        is_correct = analysis["composite_score"] >= threshold
        feedback = get_feedback_message(rating, analysis)
        
        # Salvar
        await save_flashcard_review({
            "flashcard_id": flashcard_id,
            "sub_id": sub_id or None,
            "rating": rating,
            "time_spent": time_spent_int
        }, auth_header)
        
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
        logger.error(f"[AUDIO] ❌ Erro: {e}", exc_info=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")
    finally:
        if temp_input and os.path.exists(temp_input):
            os.unlink(temp_input)
        if temp_wav and os.path.exists(temp_wav):
            os.unlink(temp_wav)

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
    """Revisão de texto digitado"""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Authorization required")
    
    try:
        time_spent_int = int(time_spent)
    except ValueError:
        raise HTTPException(status_code=400, detail="time_spent inválido")
    
    analysis = analyze_text_quality(student_text, expected_text, use_phonetic=False)
    rating = get_rating_from_analysis(analysis)
    is_correct = analysis["composite_score"] >= threshold
    feedback = get_feedback_message(rating, analysis)
    
    await save_flashcard_review({
        "flashcard_id": flashcard_id,
        "sub_id": sub_id or None,
        "rating": rating,
        "time_spent": time_spent_int
    }, auth_header)
    
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


@app.post("/upload/excel")
async def upload_excel(
    file: UploadFile = File(...),
    ano_letivo: str = Form(...),
    periodo: str = Form(...)
):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Ficheiro deve ser Excel")

    if periodo not in ["1", "2", "3"]:
        raise HTTPException(status_code=400, detail="Período deve ser 1, 2 ou 3")

    # Lista de disciplinas a IGNORAR
    disciplinas_ignoradas = {
        "português língua não materna",
        "português lingua não materna",
        "cidadania e desenvolvimento",
        "classe de conjunto",
        "formação musical",
        "instrumento",
        "assembleia de turma",
        "apoio tutorial específico",
        "aia por",
        "apoio português língua não materna",
        "motricidade",
        "atividades da vida diária",
        "coadj",
        "artes tradicionais",
        "ciências experimentais",
        "educação especial",
        "aia mat",
        "compensação curricular",
        "aia",
        "apoio ao estudo",
        "oferta complementar",
        "educação moral e religiosa",
        "aec - atividade física",
        "aec - expressão plástica",
        "aec - atividade desportiva",
        "aec - inglês",
        "aec - música",
        "aec - expressão dramática",
        "apoio ao estudo de português",
        "apoio educativo a matemática",
        "apoio ao estudo de matemática",
        "apoio educativo",
        "aecc",
        "aec - expressão artística",
        "aec- atividade desportiva",
        "aec-ensino do inglês",
        "aia bio",
        "aia - fqa",
        "assembleia de turma com dt",
        "apoio tutorial esp",
        "aec-ensino da música",
        "aec-artes plásticas",
        "aec-educação física",
        "oficina tic",
        "português língua não materna b",
        "classe conjunto",
        "instrumento - piano",
        "aia ing",
        "esp acs",
        "instrumento - trompete",
        "apoioplnm",        
    }
    
    def calculate_media(ciclo, classificacoes, total_alunos, row_dict=None):
        """
        Calcula a média conforme o ciclo:
        - 1º ciclo: I=1, S=2, B=3, MB=4
        - 2º/3º ciclo: níveis 1 a 5
        - Secundário: prioriza coluna 'Média' do Excel, senão aproxima pelas faixas
        """
        # Secundário: prioridade para coluna 'Média' do Excel
        if ciclo == 'secundario':
            media_excel = row_dict.get('Média') if row_dict else None
            if pd.notna(media_excel):
                return float(media_excel)

            # Aproximação pelas faixas (ponto médio de cada intervalo)
            sum_val = (4 * classificacoes.get('1_7', 0) + 
                      8.5 * classificacoes.get('8_9', 0) + 
                      11.5 * classificacoes.get('10_13', 0) + 
                      15.5 * classificacoes.get('14_17', 0) + 
                      19 * classificacoes.get('18_20', 0))
            total = total_alunos or 1
            return sum_val / total if total > 0 else 0

        # 1º ciclo
        if ciclo == '1_ciclo':
            sum_val = (1 * classificacoes.get('I', 0) + 
                      2 * classificacoes.get('S', 0) + 
                      3 * classificacoes.get('B', 0) + 
                      4 * classificacoes.get('MB', 0))
            total = total_alunos or 1
            return sum_val / total if total > 0 else 0
        
        # 2º e 3º ciclo
        elif ciclo in ['2_ciclo', '3_ciclo']:
            sum_val = 0
            for i in range(1, 6):
                sum_val += i * classificacoes.get(str(i), 0)
            total = total_alunos or 1
            return sum_val / total if total > 0 else 0
        
        return 0

    try:
        excel_data = pd.read_excel(file.file, sheet_name=None, engine='openpyxl')
        
        db = SessionLocal()
        registos_guardados = 0

        for sheet_name, df in excel_data.items():
            df = df.dropna(how='all').reset_index(drop=True)
            
            if df.empty:
                continue
            
            # Determinar o ciclo pela sheet
            if "Basico 1" in sheet_name:
                ciclo = "1_ciclo"
            elif "Basico 2" in sheet_name:
                ciclo = "2_ciclo"
            elif "Basico 3" in sheet_name:
                ciclo = "3_ciclo"
            elif "Secundario" in sheet_name:
                ciclo = "secundario"
            else:
                ciclo = "desconhecido"

            # Processar cada linha do DataFrame
            for _, row in df.iterrows():
                row_dict = row.to_dict()

                # Validar disciplina
                disciplina_raw = row_dict.get('Disciplina', '')
                if pd.isna(disciplina_raw):
                    continue
                disciplina_lower = str(disciplina_raw).strip().lower()

                # Ignorar disciplinas não curriculares
                if disciplina_lower in disciplinas_ignoradas:
                    continue

                # Ignorar linhas vazias
                if disciplina_lower == '' or str(row_dict.get('Turma', '')).strip() == '':
                    continue

                # Extrair classificações conforme o ciclo
                classificacoes = {}
                
                if ciclo == "1_ciclo":
                    classificacoes = {
                        "I": int(row_dict.get('I') or 0) if pd.notna(row_dict.get('I')) else None,
                        "S": int(row_dict.get('S') or 0) if pd.notna(row_dict.get('S')) else None,
                        "B": int(row_dict.get('B') or 0) if pd.notna(row_dict.get('B')) else None,
                        "MB": int(row_dict.get('MB') or 0) if pd.notna(row_dict.get('MB')) else None,
                    }
                elif ciclo in ["2_ciclo", "3_ciclo"]:
                    # Tentar várias variações de nomes de colunas
                    for i in range(1, 6):
                        val = None
                        # Tentar como string
                        if str(i) in row_dict:
                            val = row_dict.get(str(i))
                        # Tentar como int
                        elif i in row_dict:
                            val = row_dict.get(i)
                        # Tentar com espaços
                        elif f" {i}" in row_dict:
                            val = row_dict.get(f" {i}")
                        elif f"{i} " in row_dict:
                            val = row_dict.get(f"{i} ")
                        
                        if val is not None and pd.notna(val):
                            classificacoes[str(i)] = int(val)
                    
                    # Debug: Log para verificar se está a ler corretamente
                    if not classificacoes:
                        # Mostrar todas as colunas numéricas para debug
                        colunas_numericas = [k for k in row_dict.keys() if isinstance(k, (int, float)) or (isinstance(k, str) and k.strip().isdigit())]
                        logger.warning(f"Ciclo {ciclo} - Disciplina {disciplina_raw}: Nenhuma classificação encontrada. Colunas numéricas disponíveis: {colunas_numericas}")
                    
                elif ciclo == "secundario":
                    for col, key in [('1 - 7', '1_7'), ('8 - 9', '8_9'), ('10 - 13', '10_13'),
                                     ('14 - 17', '14_17'), ('18 - 20', '18_20')]:
                        val = row_dict.get(col)
                        if pd.notna(val):
                            classificacoes[key] = int(val)

                # Remover valores None
                classificacoes = {k: v for k, v in classificacoes.items() if v is not None}

                # Extrair totais
                total_alunos = int(row_dict.get('T. Alunos') or row_dict.get('Nº Alunos') or 0)
                total_positivos = int(row_dict.get('T. Posit.') or row_dict.get('T. Positivas') or 0)
                percent_positivos = float(row_dict.get('% Posit.') or row_dict.get('% Positivas') or 0.0)

                # Ignorar registos sem avaliações positivas
                if percent_positivos == 0:
                    continue

                # Calcular negativos
                total_negativos = total_alunos - total_positivos if total_alunos > 0 else 0
                percent_negativos = 100 - percent_positivos if percent_positivos > 0 else 0

                # Calcular média
                media = calculate_media(ciclo, classificacoes, total_alunos, row_dict)
                
                # Debug: Log da média calculada
                if ciclo in ['2_ciclo', '3_ciclo'] and media == 0 and classificacoes:
                    logger.warning(f"Ciclo {ciclo} - Disciplina {disciplina_raw}: Média calculada = 0 com classificações {classificacoes} e total_alunos={total_alunos}")

                # Criar registo na base de dados
                avaliacao = AvaliacaoAluno(
                    ano_letivo=ano_letivo,
                    periodo=periodo,
                    ano=str(row_dict.get('Ano', '')),
                    turma=str(row_dict.get('Turma', '')),
                    disciplina=str(disciplina_raw).strip(),
                    total_alunos=total_alunos,
                    total_positivos=total_positivos,
                    percent_positivos=percent_positivos,
                    total_negativos=total_negativos,
                    percent_negativos=percent_negativos,
                    ciclo=ciclo,
                    classificacoes=classificacoes,
                    sheet_name=sheet_name
                )
                
                # Adicionar média se o campo existir no modelo
                if hasattr(avaliacao, 'media'):
                    avaliacao.media = media
                db.add(avaliacao)
                registos_guardados += 1

        db.commit()
        db.close()

        return {
            "status": "success",
            "ano_letivo": ano_letivo,
            "periodo": periodo,
            "registos_guardados": registos_guardados,
            "sheets_processadas": list(excel_data.keys())
        }

    except Exception as e:
        logger.error(f"Erro ao processar Excel: {e}")
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")
        
@app.get("/api/avaliacoes")
async def get_avaliacoes(
    ano_letivo: Optional[str] = Query(None),
    periodo: Optional[str] = Query(None),
    ciclo: Optional[str] = Query(None),
    ano: Optional[str] = Query(None),
):
    db = SessionLocal()
    try:
        query = db.query(AvaliacaoAluno)
        
        if ano_letivo:
            query = query.filter(AvaliacaoAluno.ano_letivo == ano_letivo)
        if periodo:
            query = query.filter(AvaliacaoAluno.periodo == periodo)
        if ciclo:
            query = query.filter(AvaliacaoAluno.ciclo == ciclo)
        if ano:
            query = query.filter(AvaliacaoAluno.ano == ano)
        
        resultados = query.all()
        
        data = [
            {
                "id": av.id,
                "ano_letivo": av.ano_letivo,
                "periodo": av.periodo,
                "ano": av.ano,
                "turma": av.turma,
                "disciplina": av.disciplina,
                "total_alunos": av.total_alunos,
                "total_positivos": av.total_positivos,
                "percent_positivos": av.percent_positivos,
                "total_negativos": av.total_negativos,
                "percent_negativos": av.percent_negativos,
                "ciclo": av.ciclo,
                "classificacoes": av.classificacoes,
                "sheet_name": av.sheet_name,
                "created_at": av.created_at.isoformat() if av.created_at else None,
            }
            for av in resultados
        ]
        
        return data
        
    finally:
        db.close()

# === FIM NOVO ===

# ============================================
# ENDPOINTS DE UTILIDADE
# ============================================
@app.get("/health")
async def health_check():
    """Health check com status de todos os componentes"""
    return {
        "status": "healthy",
        "service": "Audio Processing Service",
        "version": "6.0.0 (Whisper + Phonemizer + Análise Acústica)",
        "features": {
            "tts": "gTTS",
            "stt": "Whisper (faster-whisper)" if WHISPER_AVAILABLE else "Indisponível",
            "phonetic_analysis": "Phonemizer (espeak-ng)" if G2P_AVAILABLE else "Apenas Jellyfish",
            "acoustic_analysis": "librosa",
            "audio_enhancement": "pydub"
        },
        "components": {
            "whisper": WHISPER_AVAILABLE,
            "g2p": G2P_AVAILABLE,
            "librosa": True
        }
    }

@app.post("/test/g2p")
async def test_g2p(text: str = Form(...)):
    """Testar conversão G2P"""
    phonemes = text_to_phonemes(text)
    
    if not phonemes:
        return {
            "success": False,
            "text": text,
            "phonemes": None,
            "message": "G2P não disponível"
        }
    
    return {
        "success": True,
        "text": text,
        "phonemes": phonemes,
        "message": "G2P OK"
    }

@app.post("/test/phonetic-comparison")
async def test_phonetic_comparison(
    text1: str = Form(...),
    text2: str = Form(...)
):
    """Testar comparação fonética"""
    result = compare_phonemes(text1, text2)
    
    return {
        "text1": text1,
        "text2": text2,
        "comparison": result,
        "interpretation": {
            "exact_match": result.get("phonetic_exact_match", False),
            "very_similar": result.get("phonetic_similarity", 0) >= 80,
            "similar": result.get("phonetic_similarity", 0) >= 60,
            "different": result.get("phonetic_similarity", 0) < 60
        }
    }

@app.post("/test/audio-quality")
async def test_audio_quality(audio: UploadFile = File(...)):
    """Testar análise acústica de um áudio"""
    temp_input = None
    temp_wav = None
    
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
            temp_input = temp_file.name
            shutil.copyfileobj(audio.file, temp_file)
        
        audio_segment = AudioSegment.from_file(temp_input)
        temp_wav = tempfile.mktemp(suffix=".wav")
        audio_segment.export(temp_wav, format="wav")
        
        acoustic_info = analyze_audio_quality(temp_wav)
        
        return {
            "success": True,
            "acoustic_analysis": acoustic_info,
            "original_format": audio.content_type,
            "filename": audio.filename
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
    finally:
        if temp_input and os.path.exists(temp_input):
            os.unlink(temp_input)
        if temp_wav and os.path.exists(temp_wav):
            os.unlink(temp_wav)

@app.delete("/cache/clear")
async def clear_cache():
    """Limpar cache de áudio"""
    try:
        count = 0
        for file in AUDIO_CACHE_DIR.glob("*.mp3"):
            file.unlink()
            count += 1
        return {"success": True, "files_deleted": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")

# ============================================
# STARTUP
# ============================================
if __name__ == "__main__":
    import uvicorn
    
    logger.info("=" * 60)
    logger.info("🚀 INICIANDO AUDIO SERVICE v6.0")
    logger.info("=" * 60)
    
    # Testar G2P
    if G2P_AVAILABLE:
        logger.info("🧪 Testando G2P...")
        test_words = ["na", "ba", "pa", "ma"]
        for word in test_words:
            result = text_to_phonemes(word)
            if result:
                logger.info(f"  ✅ '{word}' -> '{result}'")
            else:
                logger.warning(f"  ⚠️ '{word}' falhou")
    else:
        logger.warning("⚠️ G2P não disponível")
    
    # Status Whisper
    if WHISPER_AVAILABLE:
        logger.info("✅ Whisper carregado e pronto")
    else:
        logger.warning("⚠️ Whisper não disponível")
    
    logger.info("=" * 60)
    logger.info("🎯 Servidor pronto para fonemas!")
    logger.info("=" * 60)
    
    uvicorn.run(app, host="0.0.0.0", port=8001)
