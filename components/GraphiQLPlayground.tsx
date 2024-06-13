"use client";

import React, { useEffect, useState } from 'react';
import { GraphiQL } from 'graphiql';
import 'graphiql/graphiql.css';
import { buildSchema, GraphQLSchema } from 'graphql';
import { fetchApiDocs } from '../services/apiService';
import jsonToSDL from '../utils/jsonToSDL';
import { specifiedRules, ValidationContext } from 'graphql/validation';
import { BsArrowRepeat } from 'react-icons/bs';
import { useDispatch } from 'react-redux';
import { setMessage } from '@/store/slices/statusSlice';
import StatusPlaceholder from './statusPlaceholder';

const GraphiQLPlayground: React.FC = () => {
  const dispatch = useDispatch();

  const [schema, setSchema] = useState<GraphQLSchema | null>(null);
  const [apiEndpoint, setApiEndpoint] = useState<string>('http://15.185.193.197:4026/api');

  const updateMessage = (message: string) => {
    return dispatch(setMessage(message));
  }

  const fetchData = async () => {
    if (apiEndpoint) {
      try {
        // Fetch the existing SDL from the server
        updateMessage('Fetching JSON schema');
        const docs = await fetchApiDocs(apiEndpoint);
        // Convert JSON to SDL
        const sdl = await jsonToSDL(docs, updateMessage);
        sdl && setTimeout(() => { updateMessage(`SDL generated`); }, 300);
        console.log("FINAL SDL---->", sdl);
        // Build schema from SDL
        // console.log("SDL",sdl);
        sdl && setTimeout(() => { updateMessage(`Building Graphql Schema`); }, 300);
        setSchema(buildSchema(sdl));
      } catch (error) {
        console.error("Error fetching or building schema:", error);
        updateMessage(`Error fetching or building schema`);
        setSchema(null);
      }
    }
  };

  useEffect(() => {
    schema && setTimeout(() => { updateMessage(`GraphQL Schema Built`); }, 300);
  }, [schema]);

  // const customValidationRules: ValidationRule[] = specifiedRules.filter(rule => rule == ScalarLeafsRule);
  // console.log("specifiedRules",specifiedRules,customValidationRules);

  // //   const validateSchema = (schema: GraphQLSchema, documentAST: any) => {
  // //     const errors = validate(schema, documentAST, specifiedRules.filter(rule => rule.name !== 'KnownTypeNamesRule'));
  // //     return errors;
  // //   };

  const ignoreUnknownTypeRule = (context: ValidationContext) => {
    return {
      NamedType(node: any) {
        const typeName = node.name.value;
        const type = context.getSchema().getType(typeName);
        if (!type) {
          // Ignore unknown types, no error will be added
          return;
        }
      }
    };
  };

  const customValidationRules = [...specifiedRules, ignoreUnknownTypeRule];

  const fetcher = async (graphQLParams: any): Promise<any> => {
    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(graphQLParams),
      });
      return response.json();
    } catch (error) {
      return { data: null, errors: [{ message: 'error.message' }] };
    }
  };

  return (
    <div style={{ height: '100vh', backgroundColor: '#1e1e1e' }}>
      <div className="input-container">
        <div className='input-field'>
          <input
            type="text"
            placeholder="Enter API Endpoint"
            value={apiEndpoint}
            onChange={(e) => setApiEndpoint(e.target.value)}
          />
          <StatusPlaceholder />
        </div>
        <button onClick={() => fetchData()}>
          <BsArrowRepeat />
        </button>
      </div>
      {/* {schema && ( */}
      <GraphiQL
        fetcher={fetcher}
        dangerouslyAssumeSchemaIsValid
        schema={schema}
        validationRules={customValidationRules}
        schemaDescription={true}
      >
        <GraphiQL.Logo>
          <div style={{ display: 'none' }}></div>
        </GraphiQL.Logo>
        {/* <GraphiQL.Toolbar/> */}
      </GraphiQL>
      {/* )} */}
    </div>

  );
};

export default GraphiQLPlayground;