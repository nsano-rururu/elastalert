import { Request, Response } from 'express';
import config from '../../common/config';
import { getClient } from '../../common/elasticsearch_client';


function escapeLuceneSyntax(str: string) {
  return [].map
    .call(str, char => {
      if (
        char === '/' ||
        char === '+' ||
        char === '-' ||
        char === '&' ||
        char === '|' ||
        char === '!' ||
        char === '(' ||
        char === ')' ||
        char === '{' ||
        char === '}' ||
        char === '[' ||
        char === ']' ||
        char === '^' ||
        char === '"' ||
        char === '~' ||
        char === '*' ||
        char === '?' ||
        char === ':' ||
        char === '\\'
      ) {
        return `\\${char}`;
      }
      return char;
    })
    .join('');
}

function getQueryString(request: Request) {
  if (request.params.type === 'elastalert_error') {
    return '*:*';
  }
  else {
    return `rule_name:"${escapeLuceneSyntax((<any>request.query).rule_name) || '*'}"`;
  }
}

export default function metadataHandler(request: Request, response: Response) {
  let client = getClient();

  client.search({
    index: config.get().writeback_index,
    type: request.params.type,
    body: {
      from : request.query.from || 0, 
      size : request.query.size || 100,
      query: {
        query_string: {
          query: getQueryString(request)
        }
      },
      sort: [{ '@timestamp': { order: 'desc' } }]
    }
  }).then(function(resp) {
    let mapped = <any>resp;
    mapped.hits.hits = resp.hits.hits.map(h => h._source);
    response.send(mapped.hits);
  }, function(err) {
    response.send({
      error: err
    });
  });

}
