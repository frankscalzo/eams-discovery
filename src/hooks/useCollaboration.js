import { useState, useEffect, useCallback, useRef } from 'react';
import modernCollaborationAPI from '../services/modernCollaborationAPI';

const useCollaboration = (entityType, entityId, userId) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [collaborationStatus, setCollaborationStatus] = useState(null);
  const [pendingChanges, setPendingChanges] = useState([]);
  const [lastSync, setLastSync] = useState(null);
  
  const wsRef = useRef(null);
  const connectionIdRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const retryCountRef = useRef(0);
  const maxRetries = 5;

  // Initialize WebSocket connection
  const connect = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Create WebSocket connection
      const wsUrl = process.env.REACT_APP_WS_URL || 'wss://api.eams.optimumcloudservices.com/ws';
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = async () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        retryCountRef.current = 0;
        
        // Register connection
        const connectionId = `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        connectionIdRef.current = connectionId;
        
        await modernCollaborationAPI.connectWebSocket(connectionId, userId);
        await modernCollaborationAPI.subscribeToEntity(connectionId, entityType, entityId);
        
        // Load collaboration status
        await loadCollaborationStatus();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        attemptReconnect();
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error');
      };

    } catch (error) {
      console.error('Error connecting:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [entityType, entityId, userId]);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((data) => {
    switch (data.type) {
      case 'entity_updated':
        handleEntityUpdate(data.event);
        break;
      case 'rollback':
        handleRollback(data);
        break;
      case 'conflict_detected':
        handleConflict(data);
        break;
      case 'user_joined':
        handleUserJoined(data);
        break;
      case 'user_left':
        handleUserLeft(data);
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }, []);

  // Handle entity updates
  const handleEntityUpdate = useCallback((event) => {
    console.log('Entity updated:', event);
    setLastSync(new Date().toISOString());
    
    // Emit custom event for components to listen to
    const customEvent = new CustomEvent('entityUpdated', {
      detail: { event, entityType, entityId }
    });
    window.dispatchEvent(customEvent);
  }, [entityType, entityId]);

  // Handle rollback
  const handleRollback = useCallback((data) => {
    console.log('Rollback required:', data);
    setError('Your changes were rolled back due to a conflict');
    
    // Emit custom event for components to handle
    const customEvent = new CustomEvent('rollbackRequired', {
      detail: { data, entityType, entityId }
    });
    window.dispatchEvent(customEvent);
  }, [entityType, entityId]);

  // Handle conflict
  const handleConflict = useCallback((data) => {
    console.log('Conflict detected:', data);
    setError('Conflict detected with another user\'s changes');
    
    // Emit custom event for components to handle
    const customEvent = new CustomEvent('conflictDetected', {
      detail: { data, entityType, entityId }
    });
    window.dispatchEvent(customEvent);
  }, [entityType, entityId]);

  // Handle user joined
  const handleUserJoined = useCallback((data) => {
    console.log('User joined:', data);
    // Update collaboration status
    setCollaborationStatus(prev => ({
      ...prev,
      activeUsers: [...(prev?.activeUsers || []), data.user]
    }));
  }, []);

  // Handle user left
  const handleUserLeft = useCallback((data) => {
    console.log('User left:', data);
    // Update collaboration status
    setCollaborationStatus(prev => ({
      ...prev,
      activeUsers: (prev?.activeUsers || []).filter(user => user.id !== data.user.id)
    }));
  }, []);

  // Attempt to reconnect
  const attemptReconnect = useCallback(() => {
    if (retryCountRef.current < maxRetries) {
      retryCountRef.current++;
      const delay = Math.pow(2, retryCountRef.current) * 1000; // Exponential backoff
      
      retryTimeoutRef.current = setTimeout(() => {
        console.log(`Attempting to reconnect (attempt ${retryCountRef.current})`);
        connect();
      }, delay);
    } else {
      setError('Failed to reconnect after multiple attempts');
    }
  }, [connect]);

  // Load collaboration status
  const loadCollaborationStatus = useCallback(async () => {
    try {
      const status = await modernCollaborationAPI.getCollaborationStatus(entityType, entityId);
      setCollaborationStatus(status);
    } catch (error) {
      console.error('Error loading collaboration status:', error);
    }
  }, [entityType, entityId]);

  // Send optimistic update
  const sendUpdate = useCallback(async (changes) => {
    try {
      setIsLoading(true);
      setError(null);

      // Add to pending changes
      const changeId = `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const pendingChange = {
        id: changeId,
        changes,
        timestamp: new Date().toISOString(),
        status: 'pending'
      };

      setPendingChanges(prev => [...prev, pendingChange]);

      // Send optimistic update
      const result = await modernCollaborationAPI.optimisticUpdate(
        entityType,
        entityId,
        changes,
        userId
      );

      if (result.success) {
        // Update pending change status
        setPendingChanges(prev => 
          prev.map(change => 
            change.id === changeId 
              ? { ...change, status: 'sent' }
              : change
          )
        );
      } else {
        throw new Error(result.error);
      }

      return result;
    } catch (error) {
      console.error('Error sending update:', error);
      setError(error.message);
      
      // Update pending change status
      setPendingChanges(prev => 
        prev.map(change => 
          change.id === changeId 
            ? { ...change, status: 'failed', error: error.message }
            : change
        )
      );
      
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [entityType, entityId, userId]);

  // Resolve conflict
  const resolveConflict = useCallback(async (localChanges, remoteChanges) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await modernCollaborationAPI.resolveConflictWithCRDT(
        entityType,
        entityId,
        localChanges,
        remoteChanges
      );

      return result;
    } catch (error) {
      console.error('Error resolving conflict:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [entityType, entityId]);

  // Clear pending changes
  const clearPendingChanges = useCallback(() => {
    setPendingChanges([]);
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    setIsConnected(false);
    connectionIdRef.current = null;
  }, []);

  // Initialize on mount
  useEffect(() => {
    if (entityType && entityId && userId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [entityType, entityId, userId, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    // Connection state
    isConnected,
    isLoading,
    error,
    
    // Collaboration data
    collaborationStatus,
    pendingChanges,
    lastSync,
    
    // Actions
    sendUpdate,
    resolveConflict,
    clearPendingChanges,
    reconnect: connect,
    disconnect,
    
    // Status
    hasPendingChanges: pendingChanges.length > 0,
    hasErrors: pendingChanges.some(change => change.status === 'failed'),
    isOnline: isConnected && !error
  };
};

export default useCollaboration;
