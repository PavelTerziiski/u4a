import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

const emails = [
  'hrisi.djorova@abv.bg',
  'nasil@abv.bg',
  'antoniokolev05@gmail.com',
];

for (const email of emails) {
  await resend.emails.send({
    from: 'Pavel <pavel@u4a.bg>',
    to: [email],
    replyTo: 'roditelyat@gmail.com',
    subject: 'Как мина с u4a.bg?',
    text: 'Здравейте,\n\nАз съм Павел — създателят на u4a.bg.\n\nВидях че опитахте приложението и исках лично да попитам — как мина? Работи ли всичко добре? Има ли нещо което не е харесало или е объркало?\n\nВсеки отговор ми е изключително ценен в момента.\n\nПавел\nu4a.bg',
  });
  console.log('Изпратен до', email);
}
