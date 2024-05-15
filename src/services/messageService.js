import { ConversationModel } from '../models/conversation.schema.js';
import { MessageModel } from '../models/message.schema.js';
import { publishDirectMessage } from '../queues/message.producer.js';
import { chatChannel, socketIoChatObject } from '../app.js';

const createConversation = async (conversationId, sender, receiver) => {
    await ConversationModel.create({
        conversationId,
        senderUsername: sender,
        receiverUsername: receiver
    });
}
const addMessage = async (data) => {
    const message = await MessageModel.create(data);

    if (data.hasOffer) {
        const emailMessageDetails = {
            sender: data.senderUsername,
            amount: `${data.offer?.price}`,
            buyerUsername: data.receiverUsername,
            sellerUsername: data.senderUsername,
            title: data.offer?.gigTitle,
            description: data.offer?.description,
            deliveryDays: data.offer?.deliveryInDays,
            template: 'offer'
        }

        publishDirectMessage(
            chatChannel,
            'jobber-order-notification',
            'order-email',
            JSON.stringify(emailMessageDetails),
            'Order email sent to notification service'
        )
        
    }
    socketIoChatObject.emit('message recieved', message);
    return message;
}

const getConversation = async (sender, receiver) => {
    const query = {
        $or: [
            { senderUsername: sender, receiverUsername: receiver },
            { senderUsername: receiver, receiverUsername: sender }
        ]
    }

    const conversation = await ConversationModel.aggregate([{ $match: query }]);
    return conversation;
}

//this is used tho get the list or the recent messages
const getUserConversationList = async (username) => {
    const query = {
        $or: [
            { senderUsername: username },
            { receiverUsername: username },
        ]
    };
    const messages = await MessageModel.aggregate([
        { $match: query },
        {
            //here we are grouping the message based on there conversationId and sorting them in descending order
            $group: {
                _id: '$conversationId',
                result: { $top: { output: '$$ROOT', sortBy: { createdAt: -1 } } }
            }
        },
        /*
        ($project)
          Passes along the documents with the requested fields to the next stage in the pipeline. 
          The specified fields can be existing fields from the input documents or newly computed fields. */
        {
            $project: {
                _id: '$result._id',
                conversationId: '$result.conversationId',
                sellerId: '$result.sellerId',
                buyerId: '$result.buyerId',
                receiverUsername: '$result.receiverUsername',
                receiverPicture: '$result.receiverPicture',
                senderUsername: '$result.senderUsername',
                senderPicture: '$result.senderPicture',
                body: '$result.body',
                file: '$result.file',
                gigId: '$result.gigId',
                isRead: '$result.isRead',
                hasOffer: '$result.hasOffer',
                createdAt: '$result.createdAt'
            }
        }
    ]);

    return messages;
};

const getMessages = async (sender, receiver) => {
    const query = {
        $or: [
            { senderUsername: sender, receiverUsername: receiver },
            { senderUsername: receiver, receiverUsername: sender }
        ]
    }

    const messages = await MessageModel.aggregate([
        { $match: query },
        { $sort: { createdAt: 1 } }
    ]);
    return messages;
}

const getUserMessages = async (conversationId) => {
    const messages = await MessageModel.aggregate([
        { $match: { conversationId } },
        { $sort: { createdAt: 1 } }
    ]);
    return messages;
}

const updateOffer = async (messageId, type) => {
    const message = await MessageModel.findOneAndUpdate(
        { _id: messageId },
        {
            $set: {
                //here we are dynamically choosing the offer.accepted or offer.cancelled 
                [`offer.${type}`]: true
            }
        },
        { new: true }
    );

    return message;
}

const markMessageAsRead = async (messageId) => {
    const message = await MessageModel.findOneAndUpdate(
        { _id: messageId },
        {
            $set: {
                isRead: true
            }
        },
        { new: true }
    );

    socketIoChatObject.emit('message updated', message);

    return message;
}
const markManyMessagesAsRead = async (sender, receiver, messageId) => {
    await MessageModel.updateMany(
        { senderUsername: sender, receiverUsername: receiver, isRead: false },
        {
            $set: {
                isRead: true
            }
        }
    );

    const message = await MessageModel.findOne({ _id: messageId });
    socketIoChatObject.emit('message updated', message);

    return message;
}

export {
    createConversation,
    addMessage,
    getConversation,
    getUserConversationList,
    getMessages,
    getUserMessages,
    updateOffer,
    markMessageAsRead,
    markManyMessagesAsRead
}