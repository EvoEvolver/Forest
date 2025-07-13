import React from 'react';
import { TextField, Button, List, ListItem, ListItemText, Checkbox } from '@mui/material';
import { Array as YArray } from 'yjs';
import DeleteIcon from '@mui/icons-material/Delete';
import { NodeVM } from '@forest/schema';


interface Todo {
    text: string;
    id: number;
    done: boolean;
}

export function TodoApp({node}: {node: NodeVM}) {
    let yList = node.ydata.get("todolist");
    if (!yList) {
        yList = new YArray();
        node.ydata.set("todolist", yList);
    }

    const [todos, setTodos] = React.useState<Todo[]>([]);
    const [input, setInput] = React.useState('');

    // Subscribe to changes in the yList
    React.useEffect(() => {
        const observer = () => {
            setTodos(yList.toArray());
        };

        yList.observe(observer);
        // Initial load
        setTodos(yList.toArray());

        return () => {
            yList.unobserve(observer);
        };
    }, [yList]);

    const addTodo = () => {
        if (input.trim()) {
            const newTodo = { text: input.trim(), id: Date.now(), done: false };
            yList.insert(0, [newTodo]);
            setInput('');
        }
    };

    const toggleDone = (id: number) => {
        const index = yList.toArray().findIndex(todo => todo.id === id);
        if (index !== -1) {
            const todo = yList.get(index);
            yList.delete(index);
            yList.insert(index, [{...todo, done: !todo.done}]);
        }
    };

    const deleteTodo = (id: number) => {
        const index = yList.toArray().findIndex(todo => todo.id === id);
        if (index !== -1) {
            yList.delete(index);
        }
    };

    const sortedTodos = [...todos].sort((a, b) => Number(a.done) - Number(b.done));

    return (
        <div style={{marginTop:"20px"}}>
            <TextField
                label="New Todo"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                fullWidth
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        addTodo();
                    }
                }}
                autoComplete="off"
                placeholder="Press Enter to add"
            />
            <List>
                {sortedTodos.map((todo) => (
                    <ListItem
                        key={todo.id}
                        divider
                        secondaryAction={
                            <Button
                                size="small"
                                variant="outlined"
                                sx={{
                                    minWidth: '36px',
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    padding: 0
                                }}
                            >
                                <DeleteIcon onClick={() => deleteTodo(todo.id)} fontSize="small"/>
                            </Button>
                        }
                    >
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
        </div>
    );
}