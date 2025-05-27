import React from 'react';
import { TextField, Button, List, ListItem, ListItemText, Container, Typography, Paper, Checkbox } from '@mui/material';
import { atom, useAtom } from 'jotai';

const todosAtom = atom([]);

export default function TodoApp() {
  const [todos, setTodos] = useAtom(todosAtom);
  const [input, setInput] = React.useState('');

  const addTodo = () => {
    if (input.trim()) {
      setTodos([...todos, { text: input, id: Date.now(), done: false }]);
      setInput('');
    }
  };

  const toggleDone = (id) => {
    setTodos(todos.map(todo => todo.id === id ? { ...todo, done: !todo.done } : todo));
  };

  const sortedTodos = [...todos].sort((a, b) => a.done - b.done);

  return (
    <Container maxWidth="sm">
      <Typography variant="h4" gutterBottom align="center">Todo List</Typography>
      <Paper style={{ padding: 16, marginBottom: 16 }}>
        <TextField
          label="New Todo"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          fullWidth
        />
        <Button variant="contained" color="primary" onClick={addTodo} fullWidth style={{ marginTop: 8 }}>
          Add
        </Button>
      </Paper>
      <List>
        {sortedTodos.map((todo) => (
          <ListItem key={todo.id} divider>
            <Checkbox
              checked={todo.done}
              onChange={() => toggleDone(todo.id)}
            />
            <ListItemText
              primary={todo.text}
              style={{ textDecoration: todo.done ? 'line-through' : 'none' }}
            />
          </ListItem>
        ))}
      </List>
    </Container>
  );
}
