export enum WhatsAppIdType {
  person = 'person',
  group = 'group',
  broadcast = 'broadcast',
  stories = 'stories',
}

type WhatsAppIdSufix = Record<WhatsAppIdType, `@${string}`>;

export const whatsAppIdSufix: WhatsAppIdSufix = {
  person: '@s.whatsapp.net',
  group: '@g.us',
  broadcast: '@broadcast',
  stories: '@broadcast',
};

const isBRPhoneNumber = (phone: string) => /^55/.test(phone);

export function parsePhoneNumber(phone: string) {
  phone = phone.replace(/\D/g, '');
  if (isBRPhoneNumber(phone)) {
    const ddd = Number(phone.slice(2, 4));
    const fifthDigit = Number(phone[4]);
    if (ddd >= 31 && fifthDigit === 9) {
      phone = phone.slice(0, 4) + phone.slice(5);
    }
  }
  return phone;
}

export function formatWhatsAppId(phoneNumber: string, type: WhatsAppIdType) {
  switch (type) {
    case 'person':
    default:
      return parsePhoneNumber(phoneNumber) + whatsAppIdSufix[type];
  }
}
