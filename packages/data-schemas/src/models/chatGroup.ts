import type { IChatGroup } from '~/types';
import chatGroupSchema from '~/schema/chatGroup';

/**
 * Creates or returns the ChatGroup model using the provided mongoose instance
 */
export function createChatGroupModel(mongoose: typeof import('mongoose')) {
  return mongoose.models.ChatGroup || mongoose.model<IChatGroup>('ChatGroup', chatGroupSchema);
}

