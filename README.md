# Batch Editing Service

In order to run:

```bash
npm install
```

then

```bash
npm run dev 
```

or

```bash
npm run build
npm run start 
```

### Configuration File:

src/config.ts

- Change the port the app listen to
- Change the rate limit

## Request & Response

### Request

- path: /batch
- verb: post
- body:

```ts

export interface RequestBody {
    endpoint: {
        url: string;
        verb: Method;
    }
    payloads: {
        pathParameters: { [key: string]: string }[]
        bodyParameters: any;
    };
}
```

example:

```json
{
  "endpoint": {
    "url": "https://guesty-user-service.herokuapp.com/user/{userID}",
    "verb": "put"
  },
  "payloads": [
    {
      "pathParameters": {
        "userID": "14"
      },
      "bodyParameters": {
        "age": 30
      }
    }
  ]
}
```

### Response

- status code: 200
- body : array of string ('success' or 'fail') as the number of object in the request's payloads array



