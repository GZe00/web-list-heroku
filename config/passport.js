//Definicion de la estrategia local con sus configuraciones
require("dotenv").config();
const bcrypt = require(`bcrypt`);
const passport = require(`passport`);
const LocalStrategy = require(`passport-local`).Strategy;
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const { Users } = require(`../models`);
const { newUser, checkUserExist, linkUserProvider, randomPassword } = require(`../services/auth.service`);

passport.use(new LocalStrategy({
    usernameField: `email`
}, async (email, password, done) => {
    //Comprobar que exista el croreo electronci en la DB
    try {
        let user = await Users.findOne({ where: { email } })
        /*
        user == null si el correo no se encuentra en la BD
        */
        if (user && bcrypt.compareSync(password, user.password)) {
            return done(null, user);
        }
        //Usuario incorrecto o contraseña incorrecta
        return done(null, false);
    } catch (error) {
        done(error);
    }
}));


//Estrategia Google OAuth 2.0
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENTID,
    clientSecret: process.env.GOOGLE_SECRET,
    callbackURL: process.env.GOOGLE_REDIRECT_URI
}, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));


// Estrategia Facebook
passport.use(new FacebookStrategy({
    clientID: process.env.FB_CLIENTID,
    clientSecret: process.env.FB_SECRET,
    callbackURL: process.env.FB_REDIRECT_URI
},
    (accessToken, refreshToken, profile, done) => {
        return done(null, profile);
    }
));



//Serialización
//firmar los datos del usuario
passport.serializeUser(async (profile, done) => {
    //Google y Facebook
    if (profile.provider) {
        //obtener los datos del usuario a partir del ID
        let email = profile._json.email;

        let user = await checkUserExist(email);
        let providerId = profile.id;

        let firstname = profile.provider === "google" ? profile.given_name : profile.name.givenName;
        let lastname = profile.provider === "google" ? profile.family_name : profile.name.familyName;

        let userObj = {
            firstname,
            lastname,
            email,
            password: randomPassword(),
        };

        if (user) {
            let userId = user.id;
            //Ligamos la cuenta local con la del proveedor
            await linkUserProvider(providerId, userId, profile.provider);
            return done(null, user);
        } else {
            //Creamos la cuenta local para el proveedor
            let newUserObj = await newUser(userObj);
            let userId = newUserObj.id;
            //Ligamos la cuenta local con la del proveedor
            await linkUserProvider(providerId, userId, profile.provider);
            return done(null, newUserObj);
        }
    }
    //Firmar los datos del usuario
    return done(null, profile);

});



//Desialización
//Obtener los datos del usuario a partir del id
passport.deserializeUser(async (profile, done) => {

    try {
        switch (profile.provider) {
            case 'google':
                //Generado por google
                profile.firstname = profile.name.givenName;
                profile.lastname = profile.name.familyName;
                done(null, profile);
                break;
            case 'facebook':
                profile.firstname = profile.displayName;
                profile.lastname = "";
                done(null, profile);
                break;
            default:
                let user = await Users.findByPk(profile.id, { plain: true });
                done(null, user); //request -> request.user
                break;
        }
    } catch (error) {
        done(error);
    }

});


// Semana 3: Desencriptación de passwords