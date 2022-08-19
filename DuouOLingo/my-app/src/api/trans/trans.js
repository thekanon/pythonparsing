//export GOOGLE_APPLICATION_CREDENTIALS="/home/leedo/바탕화면/source/pythonparsing/DuouOLingo/my-app/src/api/trans/key.json"
const {TranslationServiceClient} = require('@google-cloud/translate');
// Instantiates a client
const translationClient = new TranslationServiceClient();

const projectId = 'glass-oath-349716';
const location = 'global';
const fs = require("graceful-fs")

const korList = require('./eng.json')

async function translateText(text) {
    // Construct request
    const request = {
        parent: `projects/${projectId}/locations/${location}`,
        contents: ['"'+text+'"'],
        mimeType: 'text/plain', // mime types: text/plain, text/html
        sourceLanguageCode: 'en',
        targetLanguageCode: 'ko',
    };
    // Run request
    const [response] = await translationClient.translateText(request);
    let result
    for (const translation of response.translations) {
        console.log(`Translation: ${translation.translatedText}`);
        result = translation.translatedText
    }
    return result
}
async function run(){
    const result = []
    for(i of korList){
        result.push(await translateText(i));
    }
    fs.writeFile('./result.json', JSON.stringify(result), err => {
        if (err) {
        console.error(err)
        return
    }
    //file written successfully
})    
}
run()