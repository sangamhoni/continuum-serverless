import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.get('/api/health', (c) => c.json({ status: 'ok' }));

function getUserBrain(c: any, userId: string) {
  const id = c.env.MEMORY_BRAIN.idFromName(userId);
  return c.env.MEMORY_BRAIN.get(id);
}

function getUserId(c: any): string {
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return 'demo-user';
}

// save memory
app.post('/api/memory', async (c) => {
  const userId = getUserId(c);
  const brain = getUserBrain(c, userId);
  const body = await c.req.json();
  
  return brain.fetch(new Request('http://do/memory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
});

// list memories
app.get('/api/memories', async (c) => {
  const userId = getUserId(c);
  const brain = getUserBrain(c, userId);
  const url = new URL(c.req.url);
  
  return brain.fetch(new Request(`http://do/memories${url.search}`, {
    method: 'GET',
  }));
});

// get single memory
app.get('/api/memory/:id', async (c) => {
  const userId = getUserId(c);
  const brain = getUserBrain(c, userId);
  const id = c.req.param('id');
  
  return brain.fetch(new Request(`http://do/memory?id=${id}`, {
    method: 'GET',
  }));
});

// delete memory
app.delete('/api/memory/:id', async (c) => {
  const userId = getUserId(c);
  const brain = getUserBrain(c, userId);
  const id = c.req.param('id');
  
  return brain.fetch(new Request(`http://do/memory/${id}`, {
    method: 'DELETE',
  }));
});

// update memory
app.put('/api/memory/:id', async (c) => {
  const userId = getUserId(c);
  const brain = getUserBrain(c, userId);
  const id = c.req.param('id');
  const body = await c.req.json();
  
  return brain.fetch(new Request(`http://do/memory/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
});

// chat
app.post('/api/chat', async (c) => {
  const userId = getUserId(c);
  const brain = getUserBrain(c, userId);
  const body = await c.req.json();
  
  return brain.fetch(new Request('http://do/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
});

// link memories
app.post('/api/link', async (c) => {
  const userId = getUserId(c);
  const brain = getUserBrain(c, userId);
  const body = await c.req.json();
  
  return brain.fetch(new Request('http://do/link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
});

// merge memories
app.post('/api/merge', async (c) => {
  const userId = getUserId(c);
  const brain = getUserBrain(c, userId);
  const body = await c.req.json();
  
  return brain.fetch(new Request('http://do/merge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
});

export default app;

export { MemoryBrain } from './durable-objects/memory-brain';
