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

  console.log("name,schema,cache",name,schema,typeCache);

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

  console.log("unknownTypes---->>",name,sdl,unknownTypes);

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

    console.log("SDLLLLLL---->>",sdl);

  return sdl;
};

const jsonOutputToSDL = async (name: string, json: outputJSONSchema, typeCache: Record<string, string> = {}): Promise<string> => {
  console.log("OUTPUT,,--->",name, json);
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


const jsonToSDL = async (schema: SchemaDefinition): Promise<string> => {

    let sdl = '';
    let iSDL = '';
    let oSDL = '';
    const unknownTypes: Array<{ type: 'i' | 'o', name: string }> = [];

    const typeCache: Record<string, string> = {};

    const getFieldDefinition = (fieldName:string,field:any) => {
      // console.log("field",field);
      if (field.input?.length > 0 && fieldName) {
        return `${fieldName}(${field.input.map((inputType:any) => `${inputType}: ${inputType}`).join(', ')}): ${field.isArray ? '[' : ''}${field.type}${field.isArray ? ']' : ''}`;
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
        const fetchedType = await fetchUnknownType(unknownType.type, unknownType.name);
        console.log("FETCHETYPE====>",unknownType?.type,unknownType?.name,fetchedType);
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
        sdl += `\nscalar ${unknownType?.name} \n\n`;
      }
    }

    sdl+=iSDL;
    sdl+=oSDL;
    // console.log("FETCHED==>",iSDL,oSDL);

    console.log("SDL--->",sdl);

    // sdl = `
    // type Query {
    //   loginWithPassword(LoginInput: LoginInput): AuthToken
    //   verifyOtp(VerifyOtpInput: VerifyOtpInput): AuthToken
    //   getUsers(FilterQueryInput: FilterQueryInput, PageInput: PageInput): [User]
    //   myProfile: User
    //   find(FilterQueryInput: FilterQueryInput, PageInput: PageInput): [Organisation]
    //   myOrganisation(FilterQueryInput: FilterQueryInput, PageInput: PageInput): [Organisation]
    //   listManager(String: String, FilterQueryInput: FilterQueryInput, PageInput: PageInput): [Manager]
    //   mySetting: Landlord
    //   myProperties(String: String, PageInput: PageInput): [Property]
    // }
    
    // type Mutation {
    //   createUser(UserInput: UserInput): GeneralResponse
    //   sendOtp(IdentifierInput: IdentifierInput): GeneralResponse
    //   addIam(IAmInput: IAmInput): GeneralResponse
    //   createOrg(OrganisationInput: OrganisationInput): GeneralResponse
    //   updateById(String: String, UpdateOrganisationInput: UpdateOrganisationInput): GeneralResponse
    //   addManager(String: String, ManagerInput: ManagerInput): GeneralResponse
    //   createProperty(String: String, PropertyInput: PropertyInput): GeneralResponse
    //   bulkAddProperty: GeneralResponse
    //   addUnit: GeneralResponse
    //   bulkAddUnit: GeneralResponse
    //   updateSetting(LandlordInput: LandlordInput): GeneralResponse
    //   landlordAsset(String: String, LandlordAssetInput: LandlordAssetInput): GeneralResponse
    //   createTenant(TeenantInput: TeenantInput): GeneralResponse
    // }
    
    // schema {
    //   query: Query
    //   mutation: Mutation
    // }
    
    // scalar FilterQueryInput 
    
    
    // scalar String 
    
    // input LoginInput {
    //   password: String!
    //   identifier: String!
    // }
    // input VerifyOtpInput {
    //   otp: String!
    //   identifier: String!
    // }
    // input PageInput {
    //   sort: String
    //   limit: Int
    //   skip: Int
    // }
    // input UserInput {
    //   firstName: String!
    //   lastName: String!
    //   mobile: Float!
    //   email: String
    //   password: String
    // }
    // input IdentifierInput {
    //   identifier: String!
    // }
    // input IAmInput {
    //   name: String!
    //   type: String!
    //   credencial: String!
    // }
    // input OrganisationInput {
    //   name: String!
    //   email: String!
    //   helpEmail: String
    //   mobile: Float
    //   helpMobile: Float
    //   logo: String
    //   businessUnits: [String]!
    //   address: AddressInput!
    // }
    // input AddressInput {
    //   line1: String!
    //   line2: String
    //   city: String
    //   stateOrProvince: String!
    //   location: LocationInput!
    //   country: String!
    //   pin: Int
    // }
    // input LocationInput {
    //   type: String!
    //   coordinates: [Float]!
    // }
    // input UpdateOrganisationInput {
    //   email: String
    //   helpEmail: String
    //   mobile: Float
    //   logo: String
    // }
    // input ManagerInput {
    //   name: String!
    //   permissions: PermissionInput!
    //   role: String!
    //   userIds: [String]!
    // }
    // input PermissionInput {
    //   RealState: String!
    // }
    // input PropertyInput {
    //   name: String!
    //   address: AddressInput!
    //   contactPerson: String
    //   ammenity: Array!
    //   tags: [String]!
    //   mainPic: String!
    //   photos: [String]!
    // }
    
    // scalar Array 
    
    // input LandlordInput {
    //   defaultOrgId: String
    //   defaultProperty: String
    //   defaultUnit: String
    // }
    // input LandlordAssetInput {
    //   propertyUnitMap: Array!
    // }
    // input TeenantInput {
    //   firstName: String!
    //   lastName: String
    //   orgId: String!
    //   profilePic: String
    //   email: String
    //   dob: String
    // }
    // type AuthToken {
    //   accessToken: String!
    //   firstName: String!
    //   email: String
    //   defaultLanguage: String!
    // }
    // type User {
    //   _id: String!
    //   firstName: String!
    //   lastName: String!
    //   mobile: String!
    //   email: String
    //   defaultLanguage: String
    //   isActive: String!
    // }
    // type Organisation {
    //   _id: String!
    //   name: String!
    //   isDeleted: String!
    //   email: String!
    //   createdBy: String!
    //   helpEmail: String
    //   mobile: String
    //   helpMobile: String
    //   businessUnits: [String]!
    //   logo: String
    //   address: String
    //   isActive: String!
    //   createdAt: String!
    // }
    // type Manager {
    //   _id: String!
    //   name: String!
    //   permissions: String!
    //   role: String!
    //   userIds: [String]!
    //   orgId: String!
    //   assignedBy: String!
    // }
    // type Landlord {
    //   userId: String!
    //   defaultOrgId: String
    //   defaultProperty: String
    //   defaultUnit: String
    // }
    // type Property {
    //   _id: String!
    //   name: String!
    //   isDeleted: String!
    //   orgId: String!
    //   address: String!
    //   contactPerson: String!
    //   photos: [String]
    //   mainPic: String
    //   ammenity: [String]!
    //   updatedAt: String
    //   tags: [String]
    //   ownedBy: String!
    // }
    // type GeneralResponse {
    //   message: String!
    //   refId: String
    // }
    // `;
    
  
    console.log("SDL-->>",sdl);


    return sdl;

};

export default jsonToSDL;

  //   type Query {
  //     loginWithPassword(LoginInput: LoginInput): AuthToken
  //     verifyOtp(VerifyOtpInput: VerifyOtpInput): AuthToken
  //     getUsers(FilterQueryInput: FilterQueryInput, PageInput: PageInput): [User]
  //     myProfile: User
  //     find(FilterQueryInput: FilterQueryInput, PageInput: PageInput): [Organisation]
  //     myOrganisation(FilterQueryInput: FilterQueryInput, PageInput: PageInput): [Organisation]
  //     listManager(String: String, FilterQueryInput: FilterQueryInput, PageInput: PageInput): [Manager]
  //     mySetting: Landlord
  //     myProperties(String: String, PageInput: PageInput): [Property]
  //   }
    
  //   type Mutation {
  //     createUser(UserInput: UserInput): GeneralResponse
  //     sendOtp(IdentifierInput: IdentifierInput): GeneralResponse
  //     addIam(IAmInput: IAmInput): GeneralResponse
  //     create(OrganisationInput: OrganisationInput): GeneralResponse
  //     updateById(String: String, UpdateOrganisationInput: UpdateOrganisationInput): GeneralResponse
  //     addManager(String: String, ManagerInput: ManagerInput): GeneralResponse
  //     createProp(String: String, PropertyInput: PropertyInput): GeneralResponse
  //     bulkAddProperty: GeneralResponse
  //     addUnit: GeneralResponse
  //     bulkAddUnit: GeneralResponse
  //     updateSetting(LandlordInput: LandlordInput): GeneralResponse
  //     landlordAsset(String: String, LandlordAssetInput: LandlordAssetInput): GeneralResponse
  //     createTenant(TenantInput: TenantInput): GeneralResponse
  //   }
    
  //   schema {
  //     query: Query
  //     mutation: Mutation
  //   }
    
  //   # Placeholders for unknown types
  //   scalar AuthToken
  //   scalar User
  //   scalar Organisation
  //   scalar Manager
  //   scalar Landlord
  //   scalar Property
  //   scalar GeneralResponse

  //   # Placeholders for unknown input types
  //   input LoginInput {
  //     placeholder: String
  //   }
  //   input VerifyOtpInput {
  //     placeholder: String
  //   }
  //   input FilterQueryInput {
  //     placeholder: String
  //   }
  //   input PageInput {
  //     placeholder: String
  //   }
  //   input UserInput {
  //     placeholder: String
  //   }
  //   input IdentifierInput {
  //     placeholder: String
  //   }
  //   input IAmInput {
  //     placeholder: String
  //   }
  //   input OrganisationInput {
  //     placeholder: String
  //   }
  //   input UpdateOrganisationInput {
  //     placeholder: String
  //   }
  //   input ManagerInput {
  //     placeholder: String
  //   }
  //   input PropertyInput {
  //     placeholder: String
  //   }
  //   input LandlordInput {
  //     placeholder: String
  //   }
  //   input LandlordAssetInput {
  //     placeholder: String
  //   }
  //   input TenantInput {
  //     placeholder: String
  //   }
  // `;