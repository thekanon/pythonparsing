const {TranslationServiceClient} = require('@google-cloud/translate');
// Instantiates a client
const translationClient = new TranslationServiceClient();

const projectId = 'glass-oath-349716';
const location = 'global';

async function translateText(text) {
    // Construct request
    const request = {
        parent: `projects/${projectId}/locations/${location}`,
        contents: [text],
        mimeType: 'text/plain', // mime types: text/plain, text/html
        sourceLanguageCode: 'en',
        targetLanguageCode: 'ko',
    };
    // Run request
    const [response] = await translationClient.translateText(request);

    for (const translation of response.translations) {
        console.log(`Translation: ${translation.translatedText}`);
    }
}
translateText(
    "Grant your service account the Cloud Translation API User role"
);