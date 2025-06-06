// src/App.js
import React, { useState, useRef, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Form,
  Navbar
} from 'react-bootstrap';
import { Room } from 'livekit-client';  // ← Use Room instead of connect
import { getToken, LIVEKIT_WS_HOST } from './livekitConfig';
import './App.css';

function App() {
  // --- UI state ---
  const [callActive, setCallActive] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [statusMessage, setStatusMessage] = useState('No call initiated');

  // We’ll keep a ref to the LiveKit Room object so we can disconnect later
  const roomRef = useRef(/** @type {Room|null} */(null));

  // Audio <div> container ref; when tracks arrive, we’ll attach <audio> elements here
  const audioContainerRef = useRef(null);

  // Example fixed room name and a consistent user identity:
  const ROOM_NAME = 'mre-voice-room';
  const userIdentity = `frontend-caller`;

  // Called when Start Call / End Call button is pressed
  const handleToggleCall = async () => {
    if (!callActive) {
      // 1) Starting a call: fetch a token (embed prompt as metadata)
      setStatusMessage('Starting call…');
      let token;
      try {
        token = await getToken(ROOM_NAME, userIdentity, promptText);
      } catch (err) {
        console.error('Error fetching token:', err);
        setStatusMessage('Token fetch failed');
        return;
      }

      // 2) Create a Room instance and connect to LiveKit using that token
      let room;
      try {
        room = new Room();
        await room.connect(LIVEKIT_WS_HOST, token, {
          audio: true,
          video: false,
        });
        roomRef.current = room;
        setStatusMessage('Connected, waiting for agent audio…');
      } catch (err) {
        console.error('Failed to connect to LiveKit:', err);
        setStatusMessage('LiveKit connect failed');
        return;
      }

      // 3) Subscribe to any remote audio tracks published by the agent
      room.on('trackSubscribed', (track, publication, participant) => {
        if (track.kind === 'audio') {
          const audioEl = track.attach();
          audioEl.autoplay = true;
          audioEl.controls = false;
          if (audioContainerRef.current) {
            audioContainerRef.current.appendChild(audioEl);
          }
        }
      });

      // 4) When the agent (server‐side) ends the call or the room closes:
      room.on('disconnected', () => {
        console.log('Room disconnected');
        setStatusMessage('Call ended by agent');
        setCallActive(false);
      });

      // 5) Mark call as active
      setCallActive(true);

      // 6) Once fully connected, update status
      room.on('connected', () => {
        setStatusMessage('Call is active');
      });
    } else {
      // --- Ending the call ---
      setStatusMessage('Disconnecting…');
      const room = roomRef.current;
      if (room) {
        room.disconnect();
        roomRef.current = null;
      }
      setCallActive(false);
      setStatusMessage('No call initiated');
      // Any <audio> elements will be cleaned up automatically by LiveKit
    }
  };

  const handlePromptChange = (e) => {
    setPromptText(e.target.value);
  };

  // If the component unmounts unexpectedly, ensure we disconnect
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, []);

  return (
    <>
      {/* Centered, larger header */}
      <Navbar
        bg="dark"
        variant="dark"
        expand="md"
        className="mb-4 justify-content-center"
      >
        <Container>
          <Navbar.Brand className="mx-auto">
            Voice Agent Dashboard
          </Navbar.Brand>
        </Container>
      </Navbar>

      <Container fluid>
        <Row>
          {/* Left Sidebar */}
          <Col md={3}>
            <Card className="mb-3">
              <Card.Header>Controls</Card.Header>
              <Card.Body>
                <Button
                  variant={callActive ? 'danger' : 'success'}
                  className="w-100 mb-2"
                  onClick={handleToggleCall}
                >
                  {callActive ? 'End Call' : 'Start Call'}
                </Button>
                <Card.Subtitle className="mb-1 text-muted">Status:</Card.Subtitle>
                <Card.Text>{statusMessage}</Card.Text>
                {/* Container where remote audio will appear */}
                <div ref={audioContainerRef} />
              </Card.Body>
            </Card>
          </Col>

          {/* Right Panel */}
          <Col md={9}>
            <Card>
              <Card.Header>Enter custom prompt for the agent</Card.Header>
              <Card.Body className="d-flex flex-column">
                <Form.Group className="flex-grow-1 mb-3">
                  <Form.Control
                    as="textarea"
                    placeholder="Type your detailed prompt here..."
                    style={{
                      height: '400px',
                      resize: 'vertical',
                      overflowY: 'auto',
                    }}
                    value={promptText}
                    onChange={handlePromptChange}
                    disabled={callActive} // Disable editing once the call starts
                  />
                </Form.Group>
                {/* No Submit button: prompt is sent when Start Call is clicked */}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
}

export default App;
