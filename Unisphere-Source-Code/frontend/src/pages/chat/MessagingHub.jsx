import React from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, MessageSquare, Plus, Search, Send, Trash2, Users, X } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';

import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { createDirectConversation, deleteMessage, getChatRooms, getMessageHistory, searchChatUsers } from '@/services/chatService';

const ROOM_LAST_SEEN_KEY = 'unisphere_chat_last_seen';

const getRoomStorageKey = (room) => `${room.roomType}:${room.roomId}`;

const readLastSeenMap = () => {
  try {
    return JSON.parse(localStorage.getItem(ROOM_LAST_SEEN_KEY) || '{}');
  } catch {
    return {};
  }
};

const writeLastSeenMap = (value) => {
  localStorage.setItem(ROOM_LAST_SEEN_KEY, JSON.stringify(value));
};

const getRoomAvatarLabel = (room) => {
  if (room.roomType === 'DirectConversation') {
    return room.participant?.name?.charAt(0) || room.name?.charAt(0) || 'D';
  }
  return room.name?.charAt(0) || 'R';
};

const getParticipantSubtitle = (participant) => {
  if (!participant) return 'Direct message';
  return participant.department || participant.employeeId || participant.rollNo || participant.role || 'Direct message';
};

export default function MessagingHub() {
  useDocumentTitle('Messaging Hub | Unisphere');
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [activeRoom, setActiveRoom] = React.useState(null);
  const [messageText, setMessageText] = React.useState('');
  const [roomSearch, setRoomSearch] = React.useState('');
  const [typingUsers, setTypingUsers] = React.useState(new Set());
  const [showDirectMessageModal, setShowDirectMessageModal] = React.useState(false);
  const [directSearch, setDirectSearch] = React.useState('');
  const [lastSeenMap, setLastSeenMap] = React.useState(() => readLastSeenMap());
  const [onlineUsers, setOnlineUsers] = React.useState(new Set());
  const scrollRef = React.useRef(null);
  const inputRef = React.useRef(null);
  const typingTimeoutRef = React.useRef(null);
  const prependingRef = React.useRef(false);

  const roomsQuery = useQuery({
    queryKey: ['messaging-hub-rooms'],
    queryFn: async () => {
      const data = await getChatRooms();
      return data?.rooms || [];
    },
    staleTime: 30_000,
  });

  const userSearchQuery = useQuery({
    queryKey: ['chat-user-search', directSearch],
    queryFn: async () => {
      const data = await searchChatUsers({ search: directSearch, limit: 10 });
      return data?.users || [];
    },
    enabled: showDirectMessageModal && directSearch.trim().length >= 2,
    staleTime: 15_000,
  });

  const rooms = React.useMemo(() => {
    const source = roomsQuery.data || [];
    const filtered = source.filter((room) => room.name.toLowerCase().includes(roomSearch.toLowerCase()));

    return filtered.map((room) => {
      const roomKey = getRoomStorageKey(room);
      const seenAt = lastSeenMap[roomKey];
      const lastCreatedAt = room.lastMessage?.createdAt;
      const unread = lastCreatedAt && (!seenAt || new Date(lastCreatedAt) > new Date(seenAt));
      return { ...room, unread };
    });
  }, [roomsQuery.data, roomSearch, lastSeenMap]);

  React.useEffect(() => {
    if (!activeRoom && rooms.length) {
      setActiveRoom(rooms[0]);
    }
  }, [rooms, activeRoom]);

  React.useEffect(() => {
    if (!activeRoom) return;
    const nextRoom = rooms.find((room) => getRoomStorageKey(room) === getRoomStorageKey(activeRoom));
    const hasRoomChanged = nextRoom && (
      nextRoom.name !== activeRoom.name ||
      nextRoom.unread !== activeRoom.unread ||
      nextRoom.lastMessage?.createdAt !== activeRoom.lastMessage?.createdAt
    );
    if (hasRoomChanged) {
      setActiveRoom(nextRoom);
    }
  }, [rooms, activeRoom]);

  const roomMessagesQuery = useInfiniteQuery({
    queryKey: ['chat-room-messages', activeRoom?.roomType, activeRoom?.roomId],
    initialPageParam: null,
    queryFn: ({ pageParam }) => getMessageHistory(activeRoom.roomType, activeRoom.roomId, { before: pageParam || undefined, limit: 30 }),
    getNextPageParam: (lastPage) => (lastPage?.hasMore ? lastPage.nextCursor : undefined),
    enabled: Boolean(activeRoom?.roomId),
  });

  const flattenedMessages = React.useMemo(
    () => roomMessagesQuery.data?.pages.flatMap((page) => page.messages || []) || [],
    [roomMessagesQuery.data]
  );

  const onlineMemberCount = React.useMemo(() => {
    const memberIds = new Set(
      flattenedMessages
        .map((message) => (message.sender?._id || message.sender)?.toString?.())
        .filter(Boolean)
    );
    let count = 0;
    memberIds.forEach((memberId) => {
      if (onlineUsers.has(memberId)) count += 1;
    });
    return count;
  }, [flattenedMessages, onlineUsers]);

  const markRoomSeen = React.useCallback((room, timestamp = new Date().toISOString()) => {
    if (!room) return;
    const key = getRoomStorageKey(room);
    setLastSeenMap((current) => {
      const next = { ...current, [key]: timestamp };
      writeLastSeenMap(next);
      return next;
    });
  }, []);

  React.useEffect(() => {
    if (!activeRoom || !flattenedMessages.length) return;
    const lastTimestamp = flattenedMessages[flattenedMessages.length - 1]?.createdAt || new Date().toISOString();
    markRoomSeen(activeRoom, lastTimestamp);
  }, [activeRoom, flattenedMessages, markRoomSeen]);

  React.useEffect(() => {
    if (!socket || !rooms.length) return;

    rooms.forEach((room) => {
      socket.emit('join_room', { roomType: room.roomType, roomId: room.roomId });
    });

    return () => {
      rooms.forEach((room) => {
        socket.emit('leave_room', { roomType: room.roomType, roomId: room.roomId });
      });
    };
  }, [socket, rooms]);

  React.useEffect(() => {
    if (!socket || !activeRoom) return;

    const upsertRoomPreview = (message) => {
      queryClient.setQueryData(['messaging-hub-rooms'], (current = []) => {
        const existing = current.find(
          (room) => room.roomId?.toString() === message.room?.toString() && room.roomType === message.roomType
        );
        const preview = {
          ...existing,
          roomId: existing?.roomId || message.room,
          roomType: existing?.roomType || message.roomType,
          name: existing?.name || activeRoom?.name || 'Conversation',
          participant: existing?.participant || activeRoom?.participant || null,
          lastMessage: message,
        };
        const next = existing
          ? current.map((room) => (
            room.roomId?.toString() === message.room?.toString() && room.roomType === message.roomType ? preview : room
          ))
          : [preview, ...current];

        return next.sort((a, b) => new Date(b.lastMessage?.createdAt || 0) - new Date(a.lastMessage?.createdAt || 0));
      });
    };

    const handleNewMessage = (message) => {
      if (
        activeRoom.roomId?.toString() !== message.room?.toString() ||
        activeRoom.roomType !== message.roomType
      ) {
        upsertRoomPreview(message);
        return;
      }

      queryClient.setQueryData(['chat-room-messages', activeRoom.roomType, activeRoom.roomId], (current) => {
        if (!current) {
          return {
            pages: [{ messages: [message], nextCursor: null, hasMore: false }],
            pageParams: [null],
          };
        }

        const alreadyExists = current.pages.some((page) => page.messages?.some((item) => item._id === message._id));
        if (alreadyExists) return current;

        const replacedOptimisticMessage = message.tempId
          ? current.pages.some((page) => page.messages?.some((item) => item._id === message.tempId))
          : false;

        if (replacedOptimisticMessage) {
          return {
            ...current,
            pages: current.pages.map((page) => ({
              ...page,
              messages: page.messages.map((item) => (item._id === message.tempId ? message : item)),
            })),
          };
        }

        const nextPages = [...current.pages];
        const lastPageIndex = nextPages.length - 1;
        nextPages[lastPageIndex] = {
          ...nextPages[lastPageIndex],
          messages: [...(nextPages[lastPageIndex].messages || []), message],
        };
        return { ...current, pages: nextPages };
      });

      upsertRoomPreview(message);
      markRoomSeen(activeRoom, message.createdAt || new Date().toISOString());

      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    };

    const handleMessageDeleted = ({ messageId }) => {
      queryClient.setQueryData(['chat-room-messages', activeRoom.roomType, activeRoom.roomId], (current) => {
        if (!current) return current;
        return {
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            messages: page.messages.map((message) => (
              message._id === messageId
                ? { ...message, isDeleted: true, content: null, fileUrl: null, fileName: null }
                : message
            )),
          })),
        };
      });
    };

    const handleTyping = ({ userId, name, isTyping }) => {
      if (userId === user?._id) return;
      setTypingUsers((current) => {
        const next = new Set(current);
        if (isTyping) next.add(name);
        else next.delete(name);
        return next;
      });
    };

    const handlePresenceSnapshot = ({ userIds = [] }) => {
      setOnlineUsers(new Set(userIds.map((id) => id.toString())));
    };

    const handlePresenceChanged = ({ userId, isOnline }) => {
      setOnlineUsers((current) => {
        const next = new Set(current);
        if (isOnline) next.add(userId.toString());
        else next.delete(userId.toString());
        return next;
      });
    };

    const handleConversationCreated = ({ room }) => {
      if (!room) return;
      queryClient.setQueryData(['messaging-hub-rooms'], (current = []) => {
        const exists = current.some(
          (item) => item.roomId?.toString() === room.roomId?.toString() && item.roomType === room.roomType
        );
        if (exists) return current;
        return [room, ...current];
      });
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('user_typing', handleTyping);
    socket.on('presence_snapshot', handlePresenceSnapshot);
    socket.on('presence_changed', handlePresenceChanged);
    socket.on('conversation_created', handleConversationCreated);
    socket.on('chat_error', ({ message }) => toast.error(message));

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('user_typing', handleTyping);
      socket.off('presence_snapshot', handlePresenceSnapshot);
      socket.off('presence_changed', handlePresenceChanged);
      socket.off('conversation_created', handleConversationCreated);
      socket.off('chat_error');
    };
  }, [socket, activeRoom, queryClient, user?._id, markRoomSeen]);

  React.useEffect(() => {
    if (!prependingRef.current) {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
      return;
    }

    const container = scrollRef.current;
    if (!container) return;
    const previousHeight = container.dataset.prevHeight ? Number(container.dataset.prevHeight) : 0;
    requestAnimationFrame(() => {
      const delta = container.scrollHeight - previousHeight;
      container.scrollTop = delta;
      prependingRef.current = false;
      delete container.dataset.prevHeight;
    });
  }, [flattenedMessages]);

  const createConversationMutation = useMutation({
    mutationFn: (payload) => createDirectConversation(payload),
    onSuccess: (data) => {
      const room = data?.room;
      if (!room) return;
      queryClient.setQueryData(['messaging-hub-rooms'], (current = []) => {
        const exists = current.some(
          (item) => item.roomId?.toString() === room.roomId?.toString() && item.roomType === room.roomType
        );
        if (exists) return current;
        return [room, ...current];
      });
      setActiveRoom(room);
      setShowDirectMessageModal(false);
      setDirectSearch('');
      toast.success(`Conversation ready with ${room.name}`);
    },
    onError: (error) => toast.error(error?.response?.data?.message || error?.message || 'Failed to create conversation'),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ roomType, roomId, messageId }) => deleteMessage(roomType, roomId, messageId),
    onSuccess: () => toast.success('Message deleted'),
    onError: (error) => toast.error(error?.response?.data?.message || error?.message || 'Failed to delete message'),
  });

  const handleSendMessage = (event) => {
    event.preventDefault();
    const content = messageText.trim();
    if (!content || !socket || !activeRoom) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      _id: tempId,
      room: activeRoom.roomId,
      roomType: activeRoom.roomType,
      sender: { _id: user._id, name: user.name },
      type: 'text',
      content,
      createdAt: new Date().toISOString(),
      status: 'sending',
    };

    queryClient.setQueryData(['chat-room-messages', activeRoom.roomType, activeRoom.roomId], (current) => {
      if (!current) {
        return {
          pages: [{ messages: [optimisticMessage], nextCursor: null, hasMore: false }],
          pageParams: [null],
        };
      }

      const nextPages = [...current.pages];
      const lastIndex = nextPages.length - 1;
      nextPages[lastIndex] = {
        ...nextPages[lastIndex],
        messages: [...(nextPages[lastIndex].messages || []), optimisticMessage],
      };
      return { ...current, pages: nextPages };
    });

    queryClient.setQueryData(['messaging-hub-rooms'], (current = []) => current.map((room) => (
      getRoomStorageKey(room) === getRoomStorageKey(activeRoom)
        ? { ...room, lastMessage: optimisticMessage }
        : room
    )));

    setMessageText('');
    socket.emit('send_message', {
      roomType: activeRoom.roomType,
      roomId: activeRoom.roomId,
      type: 'text',
      content,
      tempId,
    });
    socket.emit('typing', { roomType: activeRoom.roomType, roomId: activeRoom.roomId, isTyping: false });
    inputRef.current?.focus();
  };

  const handleTyping = (value) => {
    setMessageText(value);
    if (!socket || !activeRoom) return;
    socket.emit('typing', { roomType: activeRoom.roomType, roomId: activeRoom.roomId, isTyping: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { roomType: activeRoom.roomType, roomId: activeRoom.roomId, isTyping: false });
    }, 2200);
  };

  const loadOlder = async () => {
    if (!roomMessagesQuery.hasNextPage || roomMessagesQuery.isFetchingNextPage || !scrollRef.current) return;
    prependingRef.current = true;
    scrollRef.current.dataset.prevHeight = `${scrollRef.current.scrollHeight}`;
    await roomMessagesQuery.fetchNextPage();
  };

  const formatPreview = (message) => {
    if (!message) return 'No messages yet';
    if (message.isDeleted) return 'Message deleted';
    if (message.type === 'system') return message.content;
    if (message.fileName) return `File: ${message.fileName}`;
    return message.content || 'New message';
  };

  const renderMessage = (message) => {
    const mine = (message.sender?._id || message.sender)?.toString?.() === user?._id?.toString?.();
    const deleted = message.isDeleted;
    const senderId = (message.sender?._id || message.sender)?.toString?.();
    const senderOnline = senderId ? onlineUsers.has(senderId) : false;

    return (
      <div key={message._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[78%] ${mine ? 'items-end' : 'items-start'} flex gap-3`}>
          {!mine && (
            <div className="relative mt-auto">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-sm font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                {message.sender?.name?.charAt(0) || '?'}
              </div>
              {senderOnline && (
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-gray-950" />
              )}
            </div>
          )}
          <div className={mine ? 'text-right' : 'text-left'}>
            {!mine && <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{message.sender?.name || 'Unknown'}</p>}
            <div className={`rounded-[24px] px-4 py-3 text-sm shadow-sm ${
              deleted
                ? 'border border-dashed border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300'
                : mine
                  ? 'rounded-br-md bg-indigo-600 text-white'
                  : 'rounded-bl-md border border-gray-200 bg-gray-100 text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100'
            }`}>
              {deleted ? 'Message deleted' : message.content}
            </div>
            <div className={`mt-1 flex items-center gap-2 text-[11px] text-gray-400 ${mine ? 'justify-end' : 'justify-start'}`}>
              <span>{format(new Date(message.createdAt), 'HH:mm')}</span>
              {!deleted && mine && (
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate({ roomType: activeRoom.roomType, roomId: activeRoom.roomId, messageId: message._id })}
                  className="rounded-full p-1 transition hover:bg-gray-100 hover:text-rose-500 dark:hover:bg-gray-800"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="grid min-h-[75vh] md:grid-cols-[340px_1fr]">
          <aside className={`border-r border-gray-100 bg-gray-50/70 dark:border-gray-800 dark:bg-gray-900/40 ${activeRoom ? 'hidden md:block' : 'block'}`}>
            <div className="border-b border-gray-100 p-5 dark:border-gray-800">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Messages</h1>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-gray-500">
                    {isConnected ? 'Connected' : 'Reconnecting'}
                  </p>
                </div>
                <span className={`h-3 w-3 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              </div>

              <div className="relative mt-4">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={roomSearch}
                  onChange={(event) => setRoomSearch(event.target.value)}
                  placeholder="Search conversations"
                  className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
                />
              </div>

              <Button variant="outline" className="mt-4 w-full" onClick={() => setShowDirectMessageModal(true)}>
                <Plus className="mr-2 h-4 w-4" /> Create Direct Message
              </Button>
            </div>

            <div className="max-h-[calc(75vh-150px)] overflow-y-auto p-3">
              {roomsQuery.isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-20 w-full rounded-2xl" />)}
                </div>
              ) : rooms.length ? (
                <div className="space-y-2">
                  {rooms.map((room) => (
                    <button
                      key={getRoomStorageKey(room)}
                      type="button"
                      onClick={() => setActiveRoom(room)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        activeRoom?.roomId === room.roomId && activeRoom?.roomType === room.roomType
                          ? 'border-indigo-300 bg-white shadow-sm dark:border-indigo-700 dark:bg-gray-950'
                          : 'border-transparent hover:border-gray-200 hover:bg-white dark:hover:border-gray-800 dark:hover:bg-gray-950'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                          {getRoomAvatarLabel(room)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{room.name}</p>
                            {room.lastMessage?.createdAt && (
                              <span className="shrink-0 text-[11px] text-gray-400">
                                {formatDistanceToNow(new Date(room.lastMessage.createdAt), { addSuffix: false })}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 truncate text-xs text-gray-500">
                            {room.roomType === 'DirectConversation' ? `${getParticipantSubtitle(room.participant)} | ` : ''}
                            {formatPreview(room.lastMessage)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {room.roomType === 'DirectConversation' && room.participant?._id ? (
                            <span className={`h-2.5 w-2.5 rounded-full ${onlineUsers.has(room.participant._id.toString()) ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                          ) : (
                            <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                          )}
                          {room.unread && (
                            <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">New</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState title="No rooms available" description="You do not have any conversations yet. Start a direct message or join a club or event group chat." icon={Users} />
              )}
            </div>
          </aside>

          <section className={`${activeRoom ? 'flex' : 'hidden md:flex'} min-h-[75vh] flex-col`}>
            {!activeRoom ? (
              <div className="flex flex-1 items-center justify-center">
                <EmptyState title="Choose a conversation" description="Select a room from the left to load messages and start chatting." icon={MessageSquare} />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setActiveRoom(null)} className="rounded-2xl p-2 text-gray-500 transition hover:bg-gray-100 md:hidden dark:hover:bg-gray-800">
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                      {getRoomAvatarLabel(activeRoom)}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{activeRoom.name}</h2>
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                        {activeRoom.roomType === 'EventGroup'
                          ? `Event Group | ${onlineMemberCount} online now`
                          : activeRoom.roomType === 'Club'
                            ? `Club | ${onlineMemberCount} online now`
                            : `${getParticipantSubtitle(activeRoom.participant)} | ${activeRoom.participant?._id && onlineUsers.has(activeRoom.participant._id.toString()) ? 'Online' : 'Offline'}`}
                      </p>
                    </div>
                  </div>
                  <span className={`h-3 w-3 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto bg-gray-50/60 px-5 py-5 dark:bg-gray-950">
                  {roomMessagesQuery.hasNextPage && (
                    <div className="mb-4 flex justify-center">
                      <Button variant="outline" onClick={loadOlder} isLoading={roomMessagesQuery.isFetchingNextPage}>
                        Load Older Messages
                      </Button>
                    </div>
                  )}

                  {roomMessagesQuery.isLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((item) => <Skeleton key={item} className="h-20 w-full rounded-2xl" />)}
                    </div>
                  ) : flattenedMessages.length ? (
                    <div className="space-y-5">{flattenedMessages.map(renderMessage)}</div>
                  ) : (
                    <EmptyState title="No messages yet" description="Start the conversation with the first message in this room." icon={MessageSquare} />
                  )}
                </div>

                <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800">
                  {typingUsers.size > 0 && (
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">
                      {Array.from(typingUsers).join(', ')} typing...
                    </p>
                  )}
                  <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                    <textarea
                      ref={inputRef}
                      rows={2}
                      value={messageText}
                      onChange={(event) => handleTyping(event.target.value)}
                      placeholder="Write a message..."
                      className="min-h-[52px] flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-400 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
                    />
                    <Button type="submit" disabled={!messageText.trim() || !isConnected}>
                      {roomMessagesQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </form>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {showDirectMessageModal && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 backdrop-blur-sm" onClick={() => setShowDirectMessageModal(false)}>
          <div className="mx-auto mt-16 max-w-xl rounded-3xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Start Direct Message</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Search students, faculty, or admins and open a one-to-one conversation.
                </p>
              </div>
              <button type="button" onClick={() => setShowDirectMessageModal(false)} className="rounded-2xl p-2 text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative mt-5">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={directSearch}
                onChange={(event) => setDirectSearch(event.target.value)}
                placeholder="Search by name, roll no, or employee id"
                className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
              />
            </div>

            <div className="mt-5 max-h-80 overflow-y-auto">
              {directSearch.trim().length < 2 ? (
                <EmptyState title="Start typing" description="Enter at least two characters to search people." icon={Search} />
              ) : userSearchQuery.isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => <Skeleton key={item} className="h-20 w-full rounded-2xl" />)}
                </div>
              ) : userSearchQuery.data?.length ? (
                <div className="space-y-2">
                  {userSearchQuery.data.map((person) => (
                    <div
                      key={`${person.userModel}:${person._id}`}
                      className="flex w-full items-center justify-between rounded-2xl border border-gray-200 px-4 py-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-gray-800 dark:hover:border-indigo-700 dark:hover:bg-gray-950"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                          {person.name?.charAt(0) || 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{person.name}</p>
                          <p className="truncate text-xs text-gray-500">
                            {[person.userModel, person.department, person.rollNo, person.employeeId].filter(Boolean).join(' | ')}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => createConversationMutation.mutate({ targetUserId: person._id, targetUserModel: person.userModel })}
                        isLoading={
                          createConversationMutation.isPending &&
                          createConversationMutation.variables?.targetUserId === person._id
                        }
                      >
                        Message
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No matches found" description="Try a different name or identifier." icon={Users} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
