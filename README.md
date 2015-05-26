#KAOSgo#

A client + node server made to host and run games of KAOS/Assassins. Developed primaraily for use with the Williams College version of KAOS (Killing As Organized Sport).

#Client-Side Construction#
- LESS/CSS Styles
- Bootstrap
- Jade Templating
- jQuery

#Server-Side Construction#
- Node
- ExpressJS Routing
- MongoDB
- [Email.js](https://github.com/eleith/emailjs)

#External Services#
- Cloudinary (Photo Hosting)
- MongoLab (DB Hosting)

#Usage Info#
You'll need Node and a Mongo database. If you choose not to use the Cloudinary API, you must remove all references to it in server/router.js. Otherwise, modify all references to Mongo URI's, EmailJS servers, and Cloudinary servers to apply to your particular case. These references are found in app.js, server/router.js, and server/db/database.js. 

Simply call ```node app``` while in the KAOS directory to run the server. 

#Credits#
**Created By:** [NigelMNZ](http://nigelmnz.com/)  
