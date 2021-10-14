const documents = [
	require('./articles/documentLevelArticle.json'),
	require('./articles/fieldLevelArticle.json'),
]

const mockClient = {
	constructor: () => mockClient,
	withConfig: () => mockClient,
	fetch: (query, params) => 
		Promise.resolve([documents.find(document => 
				params.id.includes(document._id))])
}

module.exports = mockClient