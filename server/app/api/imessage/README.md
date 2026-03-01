# iMessages API

A "chat" refers to a conversation thread - either one-on-one or a group. This concept comes from iMessage, where users can message individuals or groups.

We don't have a separate `chats` table in our database - chats are extrapolated from the messages themselves by grouping on `chatId`. We offer a chats endpoint because it's a useful way to query this data.
