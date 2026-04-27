import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);
await resend.emails.send({
  from: 'Pavel <pavel@u4a.bg>',
  to: ['qnisnpetrov@gmail.com'],
  replyTo: 'roditelyat@gmail.com',
  subject: 'Как мина с диктовките днес?',
  text: 'Здравейте,\n\nАз съм Павел — създателят на u4a.bg.\n\nВидях че детето ви направи няколко диктовки днес и исках лично да попитам — как мина? Работи ли всичко добре? Има ли нещо което е объркало или не е харесало?\n\nВсеки отговор ми е изключително ценен в момента.\n\nПавел\nu4a.bg',
});
console.log('Изпратен до Qnis');
