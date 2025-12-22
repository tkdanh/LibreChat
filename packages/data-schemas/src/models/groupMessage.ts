import type { IGroupMessage } from '~/types';
import groupMessageSchema from '~/schema/groupMessage';

/**
 * Creates or returns the GroupMessage model using the provided mongoose instance
 */
export function createGroupMessageModel(mongoose: typeof import('mongoose')) {
  return mongoose.models.GroupMessage || mongoose.model<IGroupMessage>('GroupMessage', groupMessageSchema);
}

