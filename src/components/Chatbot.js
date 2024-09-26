import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './Chatbot.css';

const Chatbot = () => {
  const [messages, setMessages] = useState([]); 
  const [currentQuestion, setCurrentQuestion] = useState(''); 
  const [userInput, setUserInput] = useState(''); 
  const [sessionId, setSessionId] = useState(localStorage.getItem('sessionId') || ''); 
  const [errorMessage, setErrorMessage] = useState(''); 
  const [typingMessage, setTypingMessage] = useState(''); 
  const [isTyping, setIsTyping] = useState(false); 
  const messagesEndRef = useRef(null); 
  const intervalRef = useRef(null); 
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const chatWindowRef = useRef(null);

  


  useEffect(() => {
    if (sessionId) {
      continueSession(sessionId);
    } else {
      startSession();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    console.log(chatWindowRef);
    if (chatWindowRef.current) {
        console.log(chatWindowRef.current);
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;

      console.log(chatWindowRef.current.scrollTop);
    }
  }, [messages]); 
  
  
  

  const fetchHistory = async (sessionId) => {
    try {
      const response = await axios.get(`http://localhost:5050/api/history?sessionId=${sessionId}`);
      const history = response.data.history;
      if (history && history.length > 0) {
        const formattedHistory = history.map(item => [
          { from: 'bot', text: item.question },
          { from: 'user', text: item.answer },
        ]).flat(); 
        setMessages(formattedHistory);
      }
    } catch (error) {
      console.error('Error fetching session history:', error);
      setErrorMessage('Error fetching session history, please try again.');
    }
  };

  // Typewriter effect
  const typeWriterEffect = (text) => {
    let index = 0;
    setTypingMessage(''); 
    setIsTyping(true); 

    intervalRef.current = setInterval(() => {
      if (index < text.length) {
        setTypingMessage((prev) => prev + text[index]);
        index++;
      } else {
        clearInterval(intervalRef.current);
        setIsTyping(false); 
        setMessages((prevMessages) => [
          ...prevMessages,
          { from: 'bot', text: text }, 
        ]);
        setTypingMessage(''); 
      }
    }, 25); 
  };

  const startSession = async () => {
    try {
      const generatedSessionId = Math.random().toString(36).substr(2, 9); 
      const sessionResponse = await axios.post('http://localhost:5050/api/start-session', {
        sessionId: generatedSessionId,
      });

      const newSessionId = sessionResponse.data.sessionId || generatedSessionId;
      setSessionId(newSessionId);
      localStorage.setItem('sessionId', newSessionId); 
      fetchQuestion(newSessionId); 
    } catch (error) {
      console.error('Error starting session:', error);
      setErrorMessage('Error starting session, please try again.');
    }
  };

  const continueSession = async (sessionId) => {
    try {
      await fetchHistory(sessionId);
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
        setIsSessionComplete(true); 
        localStorage.removeItem('sessionId'); 
      }

      typeWriterEffect(botMessage);
      setCurrentQuestion(botMessage);
    } catch (error) {
      console.error('Error fetching question:', error);
      setErrorMessage('Error fetching question, please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (userInput.trim() === '') return; 
    setMessages((prevMessages) => [
      ...prevMessages,
      { from: 'user', text: userInput },
    ]);

    try {

      setUserInput(''); 
      await axios.post('http://localhost:5050/api/answer', {
        sessionId,
        question: currentQuestion,
        answer: userInput,
      });


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
        {isTyping && (
          <div className="message-bubble bot-message">
            {typingMessage}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

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
