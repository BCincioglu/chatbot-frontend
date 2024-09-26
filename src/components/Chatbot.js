import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './Chatbot.css';

const Chatbot = () => {
  const [messages, setMessages] = useState([]); // Mesajları tutmak için
  const [currentQuestion, setCurrentQuestion] = useState(''); // Şu anki soru
  const [userInput, setUserInput] = useState(''); // Kullanıcının girdiği yanıt
  const [sessionId, setSessionId] = useState(localStorage.getItem('sessionId') || ''); // LocalStorage'dan sessionId alınıyor
  const [errorMessage, setErrorMessage] = useState(''); // Hata mesajı
  const [typingMessage, setTypingMessage] = useState(''); // Daktilo efekti için geçici mesaj
  const [isTyping, setIsTyping] = useState(false); // Daktilo efekti devam ediyor mu
  const messagesEndRef = useRef(null); // Mesaj penceresinin en altını referans almak için
  const intervalRef = useRef(null); // setInterval için referans
  const [isSessionComplete, setIsSessionComplete] = useState(false); // Oturumun tamamlanıp tamamlanmadığını kontrol etmek için
  const chatWindowRef = useRef(null); // Sohbet penceresine referans

  


  useEffect(() => {
    if (sessionId) {
      // Eğer sessionId varsa, var olan oturuma devam et
      continueSession(sessionId);
    } else {
      // Yeni session başlat
      startSession();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    console.log(chatWindowRef);
    if (chatWindowRef.current) {
        console.log(chatWindowRef.current);
      // Sohbet penceresinin scroll konumunu en üstte tut
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;

      console.log(chatWindowRef.current.scrollTop);
    }
  }, [messages]); // Mesajlar her güncellendiğinde çalışır
  
  
  

  // Kullanıcının geçmiş konuşmalarını getir
  const fetchHistory = async (sessionId) => {
    try {
      const response = await axios.get(`http://localhost:5050/api/history?sessionId=${sessionId}`);
      const history = response.data.history;
      if (history && history.length > 0) {
        const formattedHistory = history.map(item => [
          { from: 'bot', text: item.question },
          { from: 'user', text: item.answer },
        ]).flat(); // Bot'un sorusunu ve kullanıcının cevabını ekle
        setMessages(formattedHistory); // Geçmiş mesajları messages state'ine ekle
      }
    } catch (error) {
      console.error('Error fetching session history:', error);
      setErrorMessage('Error fetching session history, please try again.');
    }
  };

  // Daktilo efektiyle yazdırma
  const typeWriterEffect = (text) => {
    let index = 0;
    setTypingMessage(''); // Önce geçici mesajı sıfırla
    setIsTyping(true); // Yazma efekti başladı

    intervalRef.current = setInterval(() => {
      if (index < text.length) {
        setTypingMessage((prev) => prev + text[index]);
        index++;
      } else {
        clearInterval(intervalRef.current);
        setIsTyping(false); // Yazma efekti tamamlandı
        setMessages((prevMessages) => [
          ...prevMessages,
          { from: 'bot', text: text }, // Tam mesajı messages dizisine ekliyoruz
        ]);
        setTypingMessage(''); // TypingMessage'ı sıfırlıyoruz
      }
    }, 25); // Her harfi 50ms aralıklarla yazdır
  };

  const startSession = async () => {
    try {
      const generatedSessionId = Math.random().toString(36).substr(2, 9); // Rastgele oturum kimliği oluştur
      const sessionResponse = await axios.post('http://localhost:5050/api/start-session', {
        sessionId: generatedSessionId,
      });

      const newSessionId = sessionResponse.data.sessionId || generatedSessionId;
      setSessionId(newSessionId);
      localStorage.setItem('sessionId', newSessionId); // SessionId'yi LocalStorage'a kaydet
      fetchQuestion(newSessionId); // İlk soruyu getir
    } catch (error) {
      console.error('Error starting session:', error);
      setErrorMessage('Error starting session, please try again.');
    }
  };

  const continueSession = async (sessionId) => {
    try {
      // Geçmiş konuşmaları getir
      await fetchHistory(sessionId);
      // Devam eden session için kaldığı soruyu getir
      fetchQuestion(sessionId);
    } catch (error) {
      console.error('Error continuing session:', error);
      setErrorMessage('Error continuing session, please try again.');
    }
  };

  const fetchQuestion = async (sessionId) => {
    try {
      const response = await axios.get(`http://localhost:5050/api/question?sessionId=${sessionId}`);
      
      const botMessage = response.data.question;
      if (!botMessage || typeof botMessage !== 'string') {
        throw new Error('Invalid bot message');
      } else if (botMessage === 'Thank you! The session is now complete.') {
        setIsSessionComplete(true); // Oturum tamamlandı
        localStorage.removeItem('sessionId'); // Oturum bitince sessionId'yi kaldır
      }

      // Daktilo efektiyle bot mesajını yazdır
      typeWriterEffect(botMessage);
      setCurrentQuestion(botMessage);
    } catch (error) {
      console.error('Error fetching question:', error);
      setErrorMessage('Error fetching question, please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (userInput.trim() === '') return; // Boş yanıt verilmişse işlem yapma

    // Kullanıcı cevabını mesajlar dizisine ekle
    setMessages((prevMessages) => [
      ...prevMessages,
      { from: 'user', text: userInput },
    ]);

    try {

      setUserInput(''); // Yanıt kutusunu temizle
      // Yanıtı backend'e gönder
      await axios.post('http://localhost:5050/api/answer', {
        sessionId,
        question: currentQuestion,
        answer: userInput,
      });


      // Yeni soru getir
      fetchQuestion(sessionId);
    } catch (error) {
      console.error('Error saving answer:', error);
      setErrorMessage('Error saving answer, please try again.');
    }
  };

  return (
    <div className="chatbot-container">
      <div className="chat-window" ref={chatWindowRef}>
        {messages.map((message, index) => (
          <div
            key={index}
            className={`message-bubble ${message.from === 'bot' ? 'bot-message' : 'user-message'}`}
          >
            {message.text}
          </div>
        ))}
        {/* Bot mesajı daktilo efekti sırasında ayrı gösteriliyor */}
        {isTyping && (
          <div className="message-bubble bot-message">
            {typingMessage}
          </div>
        )}
        {/* Mesajların en altına referans noktası ekliyoruz */}
        <div ref={messagesEndRef} />
      </div>

      {/* Hata mesajını gösterme */}
      {errorMessage && <div className="error-message">{errorMessage}</div>}

      {!isSessionComplete && (
  <form onSubmit={handleSubmit} className="input-container">
    <input
      type="text"
      value={userInput}
      onChange={(e) => setUserInput(e.target.value)}
      placeholder="Your answer..."
      className="input-field"
      autoFocus
    />
    <button type="submit" className="send-button">Send</button>
  </form>
)}
    </div>
  );
};

export default Chatbot;
