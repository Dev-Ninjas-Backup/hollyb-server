export const sendPrivateMessageSwaggerSchema = {
  type: 'object',
  properties: {
    content: {
      type: 'string',
      example: 'Hey, There how are you?',
    },
  },
  required: ['content'],
};
