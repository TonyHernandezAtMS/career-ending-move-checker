const axios = require('axios');
const _ = require('lodash');
const url = process.env.COG_API_URL;
const key = process.env.COG_API_KEY;
const BlockSinglePhraseNegativeSentimentScore = .15;

const instance = axios.create({
    baseURL: url,
    headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/json'
    }
});

function detectLanguage(text) {
    const body = {
        documents: [{
            id: 1,
            text: text
        }]
    };

    return instance
        .post('/text/analytics/v2.0/languages', body)
        .then(function (response) {
            return response.data.documents[0].detectedLanguages[0].iso6391Name;
        });
}

function keyPhrases(text, languageName) {
    const body = {
        documents: [{
            id: 1,
            language: languageName,
            text: text
        }]
    };

    return instance
        .post('/text/analytics/v2.0/keyPhrases', body)
        .then(function (response) {
            const result = response.data.documents[0].keyPhrases.map((phrase) => {
                return {
                    language: languageName,
                    text: phrase
                }
            });

            return result;
        });
}

function textSentiment(phrases) {
    const body = {
        documents: []
    };

    for (let i = 0; i < phrases.length; i++) {
        const phrase = phrases[i];
        body
            .documents
            .push({
                language: phrase.language,
                text: phrase.text,
                id: i
            })
    }

    return instance
        .post('/text/analytics/v2.0/sentiment', body)
        .then(function (response) {
            let phraseSentiment = [];
            for (let j = 0; j < response.data.documents.length; j++) {
                const sentiment = response.data.documents[j];
                phraseSentiment.push({
                    text: phrases[sentiment.id],
                    score: sentiment.score
                })
            }
            return phraseSentiment;
        });
}

function processText(text) {
    let response = {
        shouldBlock: false,
        reason: '',
        mostNegativeSentimentPhrase: '',
        sortedListOfPhrasesAndRatings: [],
        originalText: text
    };

    return detectLanguage(text)
        .then(function (languageName) {
            return keyPhrases(text, languageName);
        })
        .then(function (phrases) {
            return textSentiment(phrases)
        })
        .then(function (phraseSentiment) {
            phraseSentiment = _.orderBy(phraseSentiment, ['score'], ['asc']);
            response.sortedListOfPhrasesAndRatings = phraseSentiment;

            let mostNegativeSentimentPhrase = _.head(phraseSentiment);
            if (mostNegativeSentimentPhrase != undefined && mostNegativeSentimentPhrase.text) {
                response.mostNegativeSentimentPhrase = mostNegativeSentimentPhrase.text;
            }

            response.shouldBlock = _.some(phraseSentiment, function (phrase) {
                return phrase.score <= BlockSinglePhraseNegativeSentimentScore;
            });

            response.reason = response.shouldBlock ?
                'Single phrase had high negative sentiment' :
                '';

            return response;
        });
}

module.exports = processText;