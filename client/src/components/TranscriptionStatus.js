// client/src/components/TranscriptionStatus.js
import React, { useState, useEffect, useRef } from 'react';
import { Box, Paper, Typography, List, ListItem, ListItemText, IconButton, Collapse } from '@mui/material';
import { Close, ExpandMore, ExpandLess } from '@mui/icons-material';

const TranscriptionStatus = () => {
  const [logs, setLogs] = useState([]);
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const socketRef = useRef(window.socket);
  const endOfMessagesRef = useRef(null);

  useEffect(() => {
    const socket = socketRef.current;
    
    if (socket) {
      const handleConnect = () => {
        console.log('Connected to WebSocket server');
        addLog('Conectado al servidor de transcripción', 'info');
      };

      const handleDisconnect = () => {
        addLog('Desconectado del servidor de transcripción', 'warning');
      };

      const handleTranscriptionUpdate = (data) => {
        addLog(data.message, 'info', data);
      };

      const handleError = (error) => {
        console.error('Socket error:', error);
        addLog(`Error de conexión: ${error.message}`, 'error');
      };

      // Configurar manejadores de eventos
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('transcription-update', handleTranscriptionUpdate);
      socket.on('error', handleError);

      // Limpiar manejadores al desmontar
      return () => {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('transcription-update', handleTranscriptionUpdate);
        socket.off('error', handleError);
      };
    }
  }, []);

  const addLog = (message, type = 'info', data = {}) => {
    const timestamp = new Date().toISOString();
    setLogs(prevLogs => [...prevLogs, { message, type, timestamp, data }]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const getSocketId = () => {
    return socketRef.current?.id;
  };

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  if (!isOpen) return null;

  return (
    <Paper 
      elevation={3} 
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        width: 450,
        maxHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9999,
        overflow: 'hidden',
      }}
    >
      <Box 
        sx={{ 
          bgcolor: 'primary.main', 
          color: 'primary.contrastText',
          p: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
        }}
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <Typography variant="subtitle1" fontWeight="bold">
          Estado de la Transcripción
        </Typography>
        <Box>
          <IconButton 
            size="small" 
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
            sx={{ color: 'inherit' }}
          >
            {isMinimized ? <ExpandMore /> : <ExpandLess />}
          </IconButton>
          <IconButton 
            size="small" 
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            sx={{ color: 'inherit' }}
          >
            <Close fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Collapse in={!isMinimized} timeout="auto" unmountOnExit>
        <Box sx={{ 
          bgcolor: 'background.paper',
          flex: 1,
          overflow: 'auto',
          maxHeight: '60vh',
          p: 1,
        }}>
          {logs.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
              Esperando actualizaciones de transcripción...
            </Typography>
          ) : (
            <List dense>
              {logs.map((log, index) => (
                <ListItem 
                  key={index} 
                  sx={{ 
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:last-child': { borderBottom: 'none' }
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: log.type === 'error' ? 'error.main' : 
                                  log.type === 'warning' ? 'warning.main' : 'text.secondary',
                            fontWeight: 'medium'
                          }}
                        >
                          {log.type.toUpperCase()}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography 
                          component="span" 
                          variant="body2" 
                          color="text.primary"
                          sx={{ display: 'block' }}
                        >
                          {log.message}
                        </Typography>
                        {log.data && Object.keys(log.data).length > 0 && (
                          <Box 
                            component="pre" 
                            sx={{ 
                              mt: 1, 
                              p: 1, 
                              bgcolor: 'action.hover', 
                              borderRadius: 1,
                              fontSize: '0.75rem',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              maxHeight: '150px',
                              overflow: 'auto'
                            }}
                          >
                            {JSON.stringify(log.data, null, 2)}
                          </Box>
                        )}
                      </>
                    }
                    secondaryTypographyProps={{ component: 'div' }}
                  />
                </ListItem>
              ))}
              <div ref={endOfMessagesRef} />
            </List>
          )}
        </Box>

        <Box sx={{ 
          p: 1, 
          borderTop: '1px solid', 
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <Typography 
            variant="caption" 
            color="text.secondary" 
            onClick={clearLogs}
            sx={{ 
              cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' }
            }}
          >
            Limpiar registro
          </Typography>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default TranscriptionStatus;