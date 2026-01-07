import React, { useState, useRef, useEffect } from 'react';
import { Star, AlertCircle, RefreshCw, Mic, Square, Volume2, CheckCircle, XCircle, Loader, Keyboard } from 'lucide-react';
import { api, audioApi } from '../../api';

// ============================================
// 1. PHONETIC FLASHCARD (Fonemas Animados - Adaptado para Crianças)
// ============================================
export const PhoneticFlashcard = ({ flashcard, onComplete }) => {
  const [currentPhonemeIndex, setCurrentPhonemeIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState(null); // 'correct', 'partial', 'incorrect'
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioRef = useRef(null); // Para reproduzir TTS
  const phonemes = flashcard.phonemes || [];
  const currentPhoneme = phonemes[currentPhonemeIndex];
  const isComplete = currentPhonemeIndex >= phonemes.length;
  const progress = (currentPhonemeIndex / phonemes.length) * 100;

  useEffect(() => {
    if (isComplete) {
      onComplete?.({ flashcard_id: flashcard.flashcard_id, results });
    }
  }, [isComplete, onComplete, flashcard.flashcard_id, results]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Função para reproduzir TTS
  const playTTS = async (text, language = 'pt') => {
    try {
      const response = await audioApi.post('/tts/generate', { text, language });
      const { audio_url } = response.data;
      if (audioRef.current) {
        audioRef.current.src = audio_url;
        audioRef.current.play();
      }
    } catch (error) {
      console.error('Erro ao gerar TTS:', error);
    }
  };
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 }
      });
    
      streamRef.current = stream;
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
    
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') stopRecording();
      }, 3000);
    } catch (error) {
      alert('Erro ao aceder ao microfone');
    }
  };
  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  const processAudio = async (audioBlob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('flashcard_id', flashcard.flashcard_id);
      formData.append('expected_text', currentPhoneme.text);
      formData.append('sub_id', currentPhonemeIndex.toString());
      formData.append('time_spent', 0);
      formData.append('language', flashcard.idioma);
      const response = await audioApi.post('/audio-flashcards/review/fonema', formData);
      const result = response.data;
      const newResult = {
        phoneme: currentPhoneme.text,
        isCorrect: result.is_correct,
        similarity: result.similarity_score
      };
      setResults(prev => [...prev, newResult]);
      // Determinar tipo de feedback baseado em similarity
      let fType;
      if (result.similarity_score >= 80) {
        fType = 'correct';
        playTTS('Bom!', flashcard.idioma);
      } else if (result.similarity_score >= 50) {
        fType = 'partial';
        playTTS('Quase!', flashcard.idioma);
      } else {
        fType = 'incorrect';
        playTTS('Tenta de novo!', flashcard.idioma);
      }
      setFeedbackType(fType);
      setShowFeedback(true);
      setTimeout(() => {
        setShowFeedback(false);
        setIsProcessing(false);
        if (result.is_correct || retryCount >= maxRetries) {
          setCurrentPhonemeIndex(prev => prev + 1);
          setRetryCount(0);
        } else {
          setRetryCount(prev => prev + 1);
        }
      }, 3000); // Aumentado para dar tempo ao feedback
    } catch (error) {
      alert('Erro ao validar pronúncia');
      setIsProcessing(false);
    }
  };
  if (isComplete) {
    return null;
  }
  return (
    <div className="max-w-2xl mx-auto p-8 bg-white rounded-2xl shadow-xl">
      <div className="text-sm font-semibold text-gray-500 mb-2">{flashcard.discipline_name}</div>
      <audio ref={audioRef} className="hidden" />
      <div className="w-full h-2 bg-gray-200 rounded-full mb-4">
        <div className="h-2 bg-green-500 rounded-full" style={{ width: `${progress}%` }} />
      </div>
      {flashcard.image_url && (
        <img src={flashcard.image_url} alt={flashcard.word} className="w-64 h-64 object-cover rounded-xl mx-auto mb-4" />
      )}
      <div className="text-center mb-8">
        <button onClick={() => playTTS(flashcard.word, flashcard.idioma)} className="px-12 py-6 bg-blue-500 text-white rounded-full font-bold flex items-center gap-2 mx-auto text-3xl">
          <Volume2 className="w-8 h-8" /> {flashcard.word}
        </button>
      </div>
    
      <div className="flex justify-center gap-4 mb-8">
        {phonemes.map((phoneme, idx) => (
          <button
            key={idx}
            onClick={() => idx === currentPhonemeIndex && playTTS(phoneme.text, flashcard.idioma)}
            className={`px-12 py-6 rounded-full text-3xl font-bold transition-all ${
              idx === currentPhonemeIndex ? 'bg-indigo-500 text-white scale-110' :
              idx < currentPhonemeIndex ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-400'
            }`}
          >
            <Volume2 className="w-6 h-6 inline-block mr-2" /> {phoneme.text}
          </button>
        ))}
      </div>
      <div className="text-center relative">
        {!isRecording && !isProcessing && !showFeedback && (
          <button onClick={startRecording} className="px-12 py-6 bg-red-500 text-white rounded-full font-bold flex items-center gap-2 mx-auto text-2xl">
            <Mic className="w-8 h-8" /> Gravar
          </button>
        )}
        {isRecording && (
          <button onClick={stopRecording} className="px-12 py-6 bg-gray-800 text-white rounded-full font-bold animate-pulse flex items-center gap-2 mx-auto text-2xl">
            <Square className="w-8 h-8" /> A gravar...
          </button>
        )}
        {isProcessing && <Loader className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />}
        {showFeedback && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 rounded-2xl">
            {feedbackType === 'correct' && <CheckCircle className="w-24 h-24 text-green-500" />}
            {feedbackType === 'partial' && <AlertCircle className="w-24 h-24 text-yellow-500" />}
            {feedbackType === 'incorrect' && <XCircle className="w-24 h-24 text-red-500" />}
          </div>
        )}
        {showFeedback && !isProcessing && feedbackType !== 'correct' && retryCount < maxRetries && (
          <button onClick={startRecording} className="mt-4 px-12 py-6 bg-yellow-500 text-white rounded-full font-bold flex items-center gap-2 mx-auto text-2xl">
            <RefreshCw className="w-8 h-8" /> Tentar Novamente
          </button>
        )}
      </div>
    </div>
  );
};
// ============================================
// 2. DICTATION FLASHCARD (Ditado)
// ============================================

export const DictationFlashcard = ({ flashcard, onComplete }) => {
  const [audioUrl, setAudioUrl] = useState('');
  const [studentText, setStudentText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState(null);
  const audioRef = useRef(null);
  
  useEffect(() => {
    if (flashcard.flashcard_id) {
      loadAudio();
    }
  }, [flashcard.flashcard_id]);

  const loadAudio = async () => {
    try {
      const response = await api.get(`/audio-flashcards/${flashcard.flashcard_id}/generate-audio`);
      setAudioUrl(response.data.audio_url);
    } catch (error) {
      console.error('Erro ao carregar áudio');
    }
  };

  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSubmit = async () => {
    if (!studentText.trim()) {
      alert('Por favor, escreve algo');
      return;
    }

    setIsValidating(true);
    try {
      const formData = new FormData();
      formData.append('flashcard_id', flashcard.flashcard_id);
      formData.append('student_text', studentText);
      formData.append('expected_text', flashcard.expected_answer);
      formData.append('sub_id', flashcard.sub_id || "");
      formData.append('time_spent', 0);

      const response = await audioApi.post('/audio-flashcards/review/text', formData);

      setResult(response.data);
      setTimeout(() => {
        onComplete?.({ flashcard_id: flashcard.flashcard_id, rating: response.data.rating });
      }, 5000);
    } catch (error) {
      alert('Erro ao validar resposta');
    } finally {
      setIsValidating(false);
    }
  };

  if (result) {
    return (
      <div className="max-w-2xl mx-auto p-8 bg-white rounded-2xl shadow-xl">
        {result.is_correct ? (
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
        ) : (
          <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
        )}
        <h2 className="text-2xl font-bold text-center mb-4">
          {result.is_correct ? 'Correto! 🎉' : 'Quase lá! 💪'}
        </h2>
        <div className="bg-gray-50 p-6 rounded-lg space-y-3">
          <div>
            <p className="text-sm text-gray-600">O que escreveste:</p>
            <p className="font-semibold">{studentText}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Resposta esperada:</p>
            <p className="font-semibold text-green-700">{result.expected_text}</p>
          </div>
          <p className="text-sm text-gray-500">Similaridade: {result.similarity_score}%</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white rounded-2xl shadow-xl">
      <div className="text-sm font-semibold text-gray-500 mb-2">{flashcard.discipline_name}</div>
      <h2 className="text-3xl font-bold text-center mb-8">📝 Ditado</h2>
      
      <div className="mb-8 text-center">
        <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />
        <button
          onClick={playAudio}
          disabled={!audioUrl || isPlaying}
          className="px-8 py-4 bg-indigo-500 text-white rounded-full font-bold flex items-center gap-2 mx-auto disabled:opacity-50"
        >
          <Volume2 className="w-6 h-6" />
          {isPlaying ? 'A reproduzir...' : 'Ouvir Ditado'}
        </button>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-semibold mb-2">Escreve o que ouviste:</label>
        <textarea
          value={studentText}
          onChange={(e) => setStudentText(e.target.value)}
          className="w-full p-4 border-2 border-gray-300 rounded-lg text-lg focus:border-indigo-500 focus:outline-none"
          rows={4}
          placeholder="Escreve aqui..."
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={isValidating || !studentText.trim()}
        className="w-full py-4 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isValidating ? <Loader className="w-5 h-5 animate-spin" /> : <Keyboard className="w-5 h-5" />}
        {isValidating ? 'A validar...' : 'Submeter'}
      </button>
    </div>
  );
};

// ============================================
// 3. AUDIO QUESTION FLASHCARD (Pergunta em Áudio)
// ============================================

export const AudioQuestionFlashcard = ({ flashcard, onComplete }) => {
  const [audioUrl, setAudioUrl] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  useEffect(() => {
    if (flashcard.flashcard_id) {
      loadAudio();
    }
  }, [flashcard.flashcard_id]);

  const loadAudio = async () => {
    try {
      const response = await api.get(`/audio-flashcards/${flashcard.flashcard_id}/generate-audio`);
      setAudioUrl(response.data.audio_url);
    } catch (error) {
      console.error('Erro ao carregar áudio');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        await processAudio(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      alert('Erro ao aceder ao microfone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('flashcard_id', flashcard.flashcard_id);
      formData.append('expected_text', flashcard.expected_answer);
      formData.append('sub_id', flashcard.sub_id || "");
      formData.append('time_spent', 0);
      formData.append('language', flashcard.idioma);

      const response = await audioApi.post('/audio-flashcards/review/audio', formData);
      setResult(response.data);

      setTimeout(() => {
        onComplete?.({ flashcard_id: flashcard.flashcard_id, rating: response.data.rating });
      }, 3000);
    } catch (error) {
      alert('Erro ao validar resposta');
    } finally {
      setIsProcessing(false);
    }
  };

  if (result) {
    return (
      <div className="max-w-2xl mx-auto p-8 bg-white rounded-2xl shadow-xl">
        {result.is_correct ? <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" /> : <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />}
        <h2 className="text-2xl font-bold text-center mb-4">{result.is_correct ? 'Correto! 🎉' : 'Tenta outra vez! 💪'}</h2>
        <div className="bg-gray-50 p-6 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Disseste:</p>
          <p className="font-semibold mb-3">{result.transcription}</p>
          <p className="text-sm text-gray-600 mb-1">Resposta esperada:</p>
          <p className="font-semibold text-green-700">{result.expected_text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white rounded-2xl shadow-xl">
      <div className="text-sm font-semibold text-gray-500 mb-2">{flashcard.discipline_name}</div>
      <h2 className="text-3xl font-bold text-center mb-8">🎧 Pergunta em Áudio</h2>
      
      <div className="mb-8 text-center">
        <audio ref={audioRef} src={audioUrl} controls className="mx-auto mb-4" />
      </div>

      <div className="text-center">
        {!isRecording && !isProcessing && (
          <button onClick={startRecording} className="px-8 py-4 bg-red-500 text-white rounded-full font-bold flex items-center gap-2 mx-auto">
            <Mic className="w-6 h-6" /> Gravar Resposta
          </button>
        )}
        {isRecording && (
          <button onClick={stopRecording} className="px-8 py-4 bg-gray-800 text-white rounded-full animate-pulse flex items-center gap-2 mx-auto">
            <Square className="w-6 h-6" /> A gravar...
          </button>
        )}
        {isProcessing && <Loader className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />}
      </div>
    </div>
  );
};

// ============================================
// 4. READING FLASHCARD (Leitura)
// ============================================

export const ReadingFlashcard = ({ flashcard, onComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const mediaRecorderRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        await processAudio(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);

      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') stopRecording();
      }, 10000);
    } catch (error) {
      alert('Erro ao aceder ao microfone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('flashcard_id', flashcard.flashcard_id);
      formData.append('expected_text', flashcard.expected_answer);
      formData.append('sub_id', flashcard.sub_id || "");
      formData.append('time_spent', 0);
      formData.append('language', flashcard.idioma);

      const response = await audioApi.post('/audio-flashcards/review/audio', formData);
      setResult(response.data);

      setTimeout(() => {
        onComplete?.({ flashcard_id: flashcard.flashcard_id, rating: response.data.rating });
      }, 3000);
    } catch (error) {
      alert('Erro ao validar leitura');
    } finally {
      setIsProcessing(false);
    }
  };

  if (result) {
    return (
      <div className="max-w-2xl mx-auto p-8 bg-white rounded-2xl shadow-xl">
        {result.is_correct ? <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" /> : <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />}
        <h2 className="text-2xl font-bold text-center mb-4">{result.is_correct ? 'Boa leitura! 📖' : 'Continua a praticar! 💪'}</h2>
        <div className="bg-gray-50 p-6 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">O que leste:</p>
          <p className="font-semibold mb-3">{result.transcription}</p>
          <p className="text-sm text-gray-600 mb-1">Texto original:</p>
          <p className="font-semibold text-green-700">{flashcard.word}</p>
          <p className="text-sm text-gray-500 mt-3">Precisão: {result.similarity_score}%</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white rounded-2xl shadow-xl">
      <div className="text-sm font-semibold text-gray-500 mb-2">{flashcard.discipline_name}</div>
      <h2 className="text-3xl font-bold text-center mb-8">📖 Leitura em Voz Alta</h2>
      
      <div className="bg-indigo-50 p-8 rounded-xl mb-8">
        <p className="text-2xl text-center leading-relaxed">{flashcard.word}</p>
      </div>

      <div className="text-center">
        {!isRecording && !isProcessing && (
          <button onClick={startRecording} className="px-8 py-4 bg-red-500 text-white rounded-full font-bold flex items-center gap-2 mx-auto">
            <Mic className="w-6 h-6" /> Começar a Ler
          </button>
        )}
        {isRecording && (
          <button onClick={stopRecording} className="px-8 py-4 bg-gray-800 text-white rounded-full animate-pulse flex items-center gap-2 mx-auto">
            <Square className="w-6 h-6" /> A gravar... (clica para parar)
          </button>
        )}
        {isProcessing && <Loader className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />}
      </div>
    </div>
  );
};

export default { PhoneticFlashcard, DictationFlashcard, AudioQuestionFlashcard, ReadingFlashcard, SpellingFlashcard };

// ============================================
// 5. SPELLING FLASHCARD (Soletrar)
// ============================================

export const SpellingFlashcard = ({ flashcard, onComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const mediaRecorderRef = useRef(null);
  const [audioUrl, setAudioUrl] = useState('');
  const audioRef = useRef(null);

  useEffect(() => {
    if (flashcard.flashcard_id) {
      loadAudio();
    }
  }, [flashcard.flashcard_id]);

  const loadAudio = async () => {
    try {
      const response = await api.get(`/audio-flashcards/${flashcard.flashcard_id}/generate-audio`);
      setAudioUrl(response.data.audio_url);
    } catch (error) {
      console.error('Erro ao carregar áudio');
    }
  };

  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.play();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        await processAudio(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);

      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') stopRecording();
      }, 10000);
    } catch (error) {
      alert('Erro ao aceder ao microfone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('flashcard_id', flashcard.flashcard_id);
      formData.append('expected_text', flashcard.expected_answer);
      formData.append('sub_id', flashcard.sub_id || "");
      formData.append('time_spent', 0);
      formData.append('language', flashcard.idioma);

      const response = await audioApi.post('/audio-flashcards/review/spelling', formData);
      setResult(response.data);

      setTimeout(() => {
        onComplete?.({ flashcard_id: flashcard.flashcard_id, rating: response.data.rating });
      }, 3000);
    } catch (error) {
      alert('Erro ao validar soletração');
    } finally {
      setIsProcessing(false);
    }
  };

  if (result) {
    return (
      <div className="max-w-2xl mx-auto p-8 bg-white rounded-2xl shadow-xl">
        {result.is_correct ? <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" /> : <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />}
        <h2 className="text-2xl font-bold text-center mb-4">{result.is_correct ? 'Correto!  spelling' : 'Continua a praticar! 💪'}</h2>
        <div className="bg-gray-50 p-6 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Soletraste:</p>
          <p className="font-semibold mb-3 font-mono">{result.transcription}</p>
          <p className="text-sm text-gray-600 mb-1">Resposta esperada:</p>
          <p className="font-semibold text-green-700 font-mono">{result.expected_text}</p>
          <p className="text-sm text-gray-500 mt-3">Precisão: {result.similarity_score}%</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white rounded-2xl shadow-xl">
      <div className="text-sm font-semibold text-gray-500 mb-2">{flashcard.discipline_name}</div>
      <h2 className="text-3xl font-bold text-center mb-8">🔤 Soletrar</h2>
      
      <div className="text-center mb-8">
        <audio ref={audioRef} src={audioUrl} className="hidden" />
        <button
          onClick={playAudio}
          disabled={!audioUrl}
          className="px-12 py-6 bg-blue-500 text-white rounded-full font-bold flex items-center gap-2 mx-auto text-3xl"
        >
          <Volume2 className="w-8 h-8" /> Ouvir a palavra
        </button>
      </div>

      <div className="text-center">
        {!isRecording && !isProcessing && (
          <button onClick={startRecording} className="px-8 py-4 bg-red-500 text-white rounded-full font-bold flex items-center gap-2 mx-auto">
            <Mic className="w-6 h-6" /> Começar a Soletrar
          </button>
        )}
        {isRecording && (
          <button onClick={stopRecording} className="px-8 py-4 bg-gray-800 text-white rounded-full animate-pulse flex items-center gap-2 mx-auto">
            <Square className="w-6 h-6" /> A gravar... (clica para parar)
          </button>
        )}
        {isProcessing && <Loader className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />}
      </div>
    </div>
  );
};

