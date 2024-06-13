import { fetchUnknownType } from '../services/apiService';

// interface TypeDefinition {
//   query?: Record<string, { type: string, input: string[], description: string, isArray: boolean }>,
//   mutation?: Record<string, { type: string, input: string[], description: string, isArray: boolean }>,
//   subscription?: Record<string, any>
// }

type UnkownTypePayload = {
  t: "i" | "o";
  n: string;
};


type inputJSONSchema = {
  properties: {
    [key:string]: {
      type?: string;
      items?: { type: string, $ref?: string };
      $ref?: string;
      format?: string;
      description?: string;
      enum?: string[];
    };
  };
  type: string;
  required?: string[];
};

interface outputJSONSchema {
  required: string[],
  schema: {properties: {details:{bsonType:any,items:any}},
  bsonType: any,
  required: any[]
}
}

interface QueryDefinition {
  [key: string]: {
    input: string[];
    description: string;
    type: string;
    isArray: boolean;
  };
}

interface MutationDefinition {
  [key: string]: {
    input: string[];
    description: string;
    type: string;
    isArray: boolean;
  };
}

interface TypeDefinition {
  query: QueryDefinition;
  mutation: MutationDefinition;
}

interface SchemaDefinition {
  [key: string]: TypeDefinition;
}

const definedFields = {
  mutation: ["create"],
  query: []

} 

const convertType = (type: string): string => {
  switch (type.toLowerCase()) {
    case 'string':
      return 'String';
    case 'number':
      return 'Float';
    case 'object':
    case 'objectid':
      return 'String';//'ObjectId';
    default:
      return 'String'; // Default to String for unknown types
  }
};

const jsonInputToSDL = async (name:string, schema: inputJSONSchema, typeCache: Record<string, string> = {}) : Promise<string> => {
  
  if (typeCache[name]) {
    return ''; // Skip if already processed
  }

  // console.log("name,schema,cache",name,schema,typeCache);

  const unknownTypes: Array<{ type: 'i' | 'o', name: string }> = [];

  let sdl = `input ${name} {\n`;

  for (const [field, details] of Object.entries(schema.properties)) {
    let fieldType: string;

    // console.log("DETAILS===>",name,field,details);
    
    if (details.$ref) {
      // Handle reference to another schema
      const refName = details.$ref.split('/').pop(); // Extract the referenced schema name
      fieldType = refName || 'String'; // Use the referenced schema name or default to 'String'
      // console.log("$REF--_>",refName, fieldType);
      if (refName && !typeCache[refName]) unknownTypes.push({ type: 'i', name: refName });

    } else {
      
      switch (details.type) {
        case 'string':
          fieldType = 'String';
          break;
        case 'number':
          fieldType = 'Float';
          break;
        case 'integer':
          fieldType = 'Int';
          break;
        case 'boolean':
          fieldType = 'Boolean';
          break;
        // case 'object':
        //   fieldType = 'Object';
          break;
        case 'array':
          if (details.items?.$ref) {
            const refName = details.items.$ref.split('/').pop(); 
            fieldType = refName || 'String';
            if (refName && !typeCache[refName]) unknownTypes.push({ type: 'i', name: refName });
          } else 
          fieldType = details.items ? `[${details.items.type === 'string' ? 'String' : convertType(details.items.type) || 'String'}]` : '[String]';
          break;
        default:
          fieldType = 'String';
      }
      // console.log("TYPE-------->",name,details?.type, field, details,"===>",fieldType);
    }

    const isRequired = schema.required && schema.required.includes(field);
    sdl += `  ${field}: ${fieldType}${isRequired ? '!' : ''}\n`;
    // console.log("SDL__CURR---->",name,sdl);
  }

  sdl += '}\n';

  // console.log("unknownTypes---->>",name,sdl,unknownTypes);

  if (unknownTypes?.length>0) {
    for (const unknownType of unknownTypes) {
      try{
        typeCache[name] = unknownType?.name; 
        const refSchema = await fetchUnknownType(unknownType?.type, unknownType?.name);
        if(refSchema)
          sdl += await jsonInputToSDL(unknownType?.name, refSchema, typeCache);
        // else  sdl += `\n scalar ${unknownType?.name} \n`;
      } catch (error) {
        console.log("ERROR in unknown input:",error);
        typeCache[unknownType?.name] = 'scalar'; 
        sdl += `\nscalar ${unknownType?.name} \n\n`;}
    }
  }

    // console.log("SDLLLLLL---->>",sdl);

  return sdl;
};

const jsonOutputToSDL = async (name: string, json: outputJSONSchema, typeCache: Record<string, string> = {}): Promise<string> => {
  // console.log("OUTPUT,,--->",name, json);
  if (typeCache[name]) {
    return ''; // Skip if already processed
  }

  const unknownTypes: Array<{ type: 'i' | 'o', name: string }> = [];
  
  let sdl = `type ${name} {\n`;
  for (const [field, details] of Object.entries(json?.schema.properties)) {
    let fieldType = 'String';

    if (details.bsonType) {
      switch (details.bsonType) {
        case 'string':
          fieldType = 'String';
          break;
        case 'number':
          fieldType = 'Float';
          break;
        case 'integer':
          fieldType = 'Int';
          break;
        case 'boolean':
          fieldType = 'Boolean';
          break;
        // case 'object':
        //   fieldType = 'ObjectId';
        //   break;
        case 'array':
          if (details.items.$ref) {
            const refName = details.items.$ref.split('/').pop();
            fieldType = `[${refName}]`;
            
            if (refName && !typeCache[refName]) {
              if (refName && !typeCache[refName]) unknownTypes.push({ type: 'o', name: refName });
            }
          } else {
            fieldType = `[${details.items.bsonType === 'string' ? 'String' :  convertType(details.items.bsonType) || 'String'}]`;
          }
          break;
        default:
          fieldType = 'String';
      }
    }

    const isRequired = json?.schema?.required && json?.schema.required.includes(field);
    sdl += `  ${field}: ${fieldType}${isRequired ? '!' : ''}\n`;
  }

  sdl += '}\n';

  if (unknownTypes?.length>0) {
    for (const unknownType of unknownTypes) {
  try{
    typeCache[name] = unknownType?.name; 
    const refSchema = await fetchUnknownType(unknownType?.type, unknownType?.name);
    if(refSchema)
    sdl += await jsonInputToSDL(unknownType?.name, refSchema, typeCache);
  } catch (error) {console.log("ERROR in unknown output:",error);}
    }
  }


  return sdl;
};


const jsonToSDL = async (schema: SchemaDefinition, updateMessage?: any): Promise<string> => {

    let sdl = '';
    let iSDL = '';
    let oSDL = '';
    const unknownTypes: Array<{ type: 'i' | 'o', name: string }> = [];

    const typeCache: Record<string, string> = {}; 

    setTimeout(() => {
      updateMessage("Generating SDL");
    }, 200);

    const getFieldDefinition = (fieldName:string,field:any) => {
      // console.log("field",field);
      if (field.input?.length > 0 && fieldName) {

        const paramCounts: Record<string, number> = {};
        const params = field.input.map((inputType: any) => {
          if (!paramCounts[inputType]) paramCounts[inputType] = 0;
          paramCounts[inputType]++;
          const paramName = paramCounts[inputType] > 1 ? `${inputType}${paramCounts[inputType] - 1}` : inputType; 
          return `${paramName}: ${inputType}`;
        }).join(', ');
    
        return `${fieldName}(${params}): ${field.isArray ? '[' : ''}${field.type}${field.isArray ? ']' : ''}`;

        // return `${fieldName}(${field.input.map((inputType:any) => `${inputType}: ${inputType}`).join(', ')}): ${field.isArray ? '[' : ''}${field.type}${field.isArray ? ']' : ''}`;
      } else {
        return `${fieldName}: ${field.isArray ? '[' : ''}${field.type}${field.isArray ? ']' : ''}`;
      }
    };
  
    const addUnknownTypes = (field:any) => {
      // console.log("FIELD---->",field.type, schema, !!field.type,!unknownTypes.find(e=>e.name===field.type));
      if (field?.input?.length>0) {
        field.input.forEach((inputType:any) => {
          // console.log("inputs--->",unknownTypes,inputType);
          if (!schema[inputType] && !unknownTypes.find(e=>e.name===inputType)) {
            unknownTypes.push({ type: 'i', name: inputType });
          }
        });
      }
      if (!!field.type && !unknownTypes.find(e=>e.name===field.type)) {
        unknownTypes.push({ type: 'o', name: field.type });
      }
    };
  
    // Generating Query type
    sdl += 'type Query {\n';
    for (const typeName in schema) {
      const type = schema[typeName];
      for (const queryName in type.query) {
        const query = type.query[queryName];
        // console.log("QUERY",query,sdl);
        sdl += `  ${getFieldDefinition(queryName,query)}\n`;
        addUnknownTypes(query);
      }
    }
    sdl += '}\n\n';
  
    // Generating Mutation type
    sdl += 'type Mutation {\n';
    for (const typeName in schema) {
      const type = schema[typeName];
      for (const mutationName in type.mutation) {
        const mutation = type.mutation[mutationName];
        let uniqueName = '';
        if(!!definedFields.mutation.find(e=>e===mutationName))
           uniqueName = `${mutationName}${typeName}`;
        sdl += `  ${getFieldDefinition(uniqueName || mutationName,mutation)}\n`;
        addUnknownTypes(mutation);
      }
    }
    sdl += '}\n\n';

    // console.log("UNTYPE--->",unknownTypes);

  
    // Generating Schema type
    sdl += 'schema {\n';
    sdl += '  query: Query\n';
    sdl += '  mutation: Mutation\n';
    sdl += '}\n';
  
    // Fetch and add unknown types
    for (const unknownType of unknownTypes) {
      try{
        setTimeout(() => {
          updateMessage(`Fetching UnknownType ${unknownType.name}`);
        }, 300);
        const fetchedType = await fetchUnknownType(unknownType.type, unknownType.name);
        // console.log("FETCHETYPE====>",unknownType?.type,unknownType?.name,fetchedType);
        switch (unknownType.type){ 
          case 'i':
             iSDL+= await jsonInputToSDL(unknownType?.name,fetchedType, typeCache);
          break;
          case 'o':
            // console.log("unknownType?.name",unknownType?.name);
             oSDL+= await jsonOutputToSDL(unknownType?.name,fetchedType, typeCache);
          break;
        }
      } catch (error) {
        console.log("errrooor",error);
        setTimeout(() => {
          updateMessage(`Failed to fetch ${unknownType.name}`);
        }, 400);
        sdl += `\nscalar ${unknownType?.name} \n\n`;
      }
    }

    sdl+=iSDL;
    sdl+=oSDL;
    // console.log("FETCHED==>",iSDL,oSDL);

    // console.log("SDL--->",sdl);


    return sdl;

};

export default jsonToSDL;
 