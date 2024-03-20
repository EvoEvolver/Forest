import React from 'react';
import Paper from '@mui/material/Paper';
import Input from '@mui/material/Input';
import Button from '@mui/material/Button';
import {styled} from '@mui/system';

const currentPort = (process.env.NODE_ENV || 'development') == 'development' ? "29999" : window.location.port;

const RootContainer = styled('div')({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
});

const HistoryPaper = styled(Paper)({
    flex: '1 1 80%',
    overflowY: 'auto',
    width: '100%',
    boxSizing: 'border-box',
    padding: '16px',
});

const InputPaper = styled(Paper)({
    flex: '0 1 auto',
    padding: '16px',
    marginTop: '10px',
    boxSizing: 'border-box',
    width: 'calc(100%)',
});

function Chatbot() {

    const [messages, setMessages] = React.useState([]);
    const [input, setInput] = React.useState('');

    const handleSecondButtonClick = () => {
        // send an api request to localhost:currentPort/chatFocusNode. POST
        const fallBackMessages = [...messages];
        const userInputMessage = {"content": input, "who": "user"};
        const safeLatestMessages = [...messages, userInputMessage];
        setMessages(safeLatestMessages);
        setInput('');
        const url = `http://127.0.0.1:${currentPort}/chatFocusNode`;
        const requestOptions = {
            method: 'POST',
        };

        fetch(url, requestOptions)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if(data['status'] === 400) {
                    throw new Error('Chatbot is busy.');
                }
                setMessages([...safeLatestMessages, {"content": data['message'], "who": "chatbot"}]);
            })
            .catch(error => {
                console.error('There was a problem with your fetch operation:', error);
                // pop up the last message of messages and set input back to it.
                setMessages(fallBackMessages);
                setInput(userInputMessage.content);
            });

    }
    return (
        <RootContainer>
            <HistoryPaper elevation={3}>
                {messages.map((message, index) => {
                    if (message.who === "user") {
                        return <div key={index} style={{textAlign: 'right'}}>You: {message.content}</div>
                    } else {
                        return <div key={index}>AI Assistant: {message.content}</div>
                    }

                })}
            </HistoryPaper>
            <InputPaper elevation={3}>
                <Input style={{width: "80%"}} value={input} onChange={(e) => setInput(e.target.value)}></Input>
                <Button style={{float: "right"}} onClick={() => {
                    handleSecondButtonClick();
                }}>Send</Button>
            </InputPaper>
        </RootContainer>
    );
}

export default Chatbot;