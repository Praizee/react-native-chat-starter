import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'chat_offline_queue';

export interface QueuedMessage {
  localId: string;
  conversationId: string;
  senderId: string;
  text: string;
  queuedAt: number;
}

async function readQueue(): Promise<QueuedMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedMessage[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedMessage[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueueMessage(msg: QueuedMessage): Promise<void> {
  const queue = await readQueue();
  queue.push(msg);
  await writeQueue(queue);
}

export async function dequeueMessage(localId: string): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.filter((m) => m.localId !== localId));
}

export async function getPendingMessages(
  conversationId: string,
): Promise<QueuedMessage[]> {
  const queue = await readQueue();
  return queue.filter((m) => m.conversationId === conversationId);
}

export async function flushQueue(
  sendFn: (msg: QueuedMessage) => Promise<void>,
): Promise<void> {
  const queue = await readQueue();
  for (const msg of queue) {
    try {
      await sendFn(msg);
      await dequeueMessage(msg.localId);
    } catch {
      // leave in queue for next flush
    }
  }
}
