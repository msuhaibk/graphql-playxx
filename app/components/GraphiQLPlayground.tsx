"use client";

import React, { useState, useEffect } from 'react';
import { GraphiQL } from 'graphiql';
import 'graphiql/graphiql.css';
import { buildSchema, GraphQLSchema } from 'graphql';
import { fetchApiDocs } from '../services/apiService';
import jsonToSDL from '../utils/jsonToSDL';
import { ValidationRule, specifiedRules, KnownTypeNamesRule, ScalarLeafsRule, ValidationContext } from 'graphql/validation';
// import jsonToSDL from '../utils/jsonToSDL';

const respSchema = `
scalar ObjectId

# Custom scalar type representing MongoDB ObjectId

type TokenResponse {
  accessToken: String!
  firstName: String!
  email: String
  defaultLanguage: String!
}

type User {
  _id: ID!
  firstName: String!
  lastName: String!
  mobile: String!
  email: String
  defaultLanguage: String
  isActive: Boolean!
}

# Represents the token response received after verifying OTP

input LoginInput {
  password: String!
  identifier: String!
}

# Input type for login operation

input VerifyOtpInput {
  otp: String!
  identifier: String!
}

# Input type for OTP verification operation

input ManagerInput {
  name: String!
  role: ManagerRole!
  userIds: [String!]!
}

type  ManagerPermissions {
  RealState: ID
}

enum ManagerRole {
  Admin
  View
  Add
  Edit
}

input LandlordInput {
  # Define the fields for LandlordInput as required
  field1: String!
  field2: String
  # Add other fields as necessary
}

type Subscription {
  # Define your subscription fields here
  exampleSubscription: String
}

input PageInput {
  sort: SortInput
  limit: Int
  skip: Int
}

enum IAMType {
  BASIC
  X_API_KEY
  PASSWORD
}

input Array {
  items: [String]
}


input TenantInput {
  firstName: String!
  lastName: String!
  orgId: String! # assuming it's a String based on the description "A mongo id"
  profilePic: String
  email: String
  dob: String
}

# email: String @constraint(format: "email")
# dob: String @constraint(pattern: "^(0[1-9]|[12][0-9]|3[01])/((0[1-9]|1[0-2])/(19|20)\\d{2})$")

scalar Date

input FilterQueryInput {
  field: String
  value: String
}

# Input type for pagination

input UserInput {
  firstName: String!
  lastName: String!
  mobile: Float!
  email: String!
  password: String!
}

# Input type for creating a user

input IdentifierInput {
  identifier: String!
}

# Input type for identifier

input IAmInput {
  name: String!
  type: IAMType!
  credential: CredentialInput!
}

# Input type for IAM operation

input CredentialInput {
  # Could be one of the following types
  basicAuthInput: BasicAuthInput
  xApiKeyInput: XApiKeyInput
}

# Input type for credentials

input BasicAuthInput {
  username: String!
  password: String!
}

# Input type for basic authentication

input XApiKeyInput {
  apiKey: String!
}

# Input type for X-API-Key authentication

type Manager {
  _id: ObjectId!
  name: String!
  permissions: ManagerPermissions!
  role: ManagerRole!
  userIds: [ObjectId!]!
  orgId: ObjectId!
  assignedBy: ObjectId!
}

# Represents a manager managing properties for an organization

input OrganisationInput {
  name: String!
  email: String!
  helpEmail: String!
  mobile: Float!
  helpMobile: Float!
  logo: String!
  businessUnits: [BusinessUnit!]!
}

# Input type for creating an organization

input UpdateOrganisationInput {
  email: String!
  helpEmail: String!
  mobile: Float!
  logo: String!
}

# Input type for updating an organization

enum BusinessUnit {
  RealState
}

# Business units within an organization


input AddressInput {
  line1: String!
  line2: String
  city: String!
  stateOrProvince: String!
  location: String!
  country: String!
  pin: Int
}

# Input type for address

input PropertyInput {
  name: String!
  address: AddressInput!
  contactPerson: String
  ammenity: [Array]!
  tags: [String]!
  mainPic: String!
  photos: [String]!
}


type Property {
  # Mutations
  create(String: String, PropertyInput: PropertyInput): GeneralResponse
  bulkAddProperty: GeneralResponse
  addUnit: GeneralResponse
  bulkAddUnit: GeneralResponse
}

input LandlordAssetInput {
  propertyUnitMap: [Array!]!
}

type Landlord {
  # Queries
  mySetting: Landlord
  myProperties(propertyId: String, pageInput: PageInput, filter: [String]!): [Property]

  # Mutations
  updateSetting(LandlordInput: LandlordInput): GeneralResponse
  landlordAsset(String: String, LandlordAssetInput: LandlordAssetInput): GeneralResponse
}

type Tenant {
  # Mutations
  create(TenantInput: TenantInput): GeneralResponse
}

# Represents a tenant

type GeneralResponse {
  message: String!
  refId: String
}

type Organisation {
  _id: ID!
  name: String!
  isDeleted: Boolean!
  email: String!
  createdBy: ID!
  helpEmail: String!
  mobile: Float!
  helpMobile: Float!
  businessUnits: [String!]!
  logo: String
  isActive: Boolean!
  createdAt: Date!
}

input SortInput {
  field: String
  order: SortOrder
}

enum SortOrder {
  ASC
  DESC
}

type Query {
  loginWithPassword(LoginInput: LoginInput): TokenResponse
  verifyOtp(VerifyOtpInput: VerifyOtpInput): TokenResponse
  getUsers(FilterQueryInput: FilterQueryInput, PageInput: PageInput): [User]
  myProfile: User
  find(FilterQueryInput: FilterQueryInput, PageInput: PageInput): [Organisation]
  myOrganisation(FilterQueryInput: FilterQueryInput, PageInput: PageInput): [Organisation]
  listManager(String: String, FilterQueryInput: FilterQueryInput, PageInput: PageInput): [Manager]
  mySetting: Landlord
  myProperties(String: String, PageInput: PageInput, filter: [String]!): [Property]
}

type Mutation {
  createUser(UserInput: UserInput): GeneralResponse
  sendOtp(IdentifierInput: IdentifierInput): GeneralResponse
  addIam(IAmInput: IAmInput): GeneralResponse
  create(OrganisationInput: OrganisationInput): GeneralResponse
  updateById(String: String, UpdateOrganisationInput: UpdateOrganisationInput): GeneralResponse
  addManager(String: String, ManagerInput: ManagerInput): GeneralResponse
  createProp(String: String, PropertyInput: PropertyInput): GeneralResponse
  bulkAddProperty: GeneralResponse
  addUnit: GeneralResponse
  bulkAddUnit: GeneralResponse
  updateSetting(LandlordInput: LandlordInput): GeneralResponse
  landlordAsset(String: String, LandlordAssetInput: LandlordAssetInput): GeneralResponse
  createTenant(TenantInput: TenantInput): GeneralResponse
}

schema {
  query: Query
  mutation: Mutation
  subscription: Subscription
}

# The GraphQL schema
`;

const GraphiQLPlayground: React.FC = () => {
    const [schema, setSchema] = useState<GraphQLSchema | null>(null);


    useEffect(() => {

        const fetchData = async () => {
            try {
                // Fetch the existing SDL from the server
                const docs = await fetchApiDocs();

                // Convert JSON to SDL
                const sdl = await jsonToSDL(docs);
                console.log("FINAL SDL---->",sdl);
                // Build schema from SDL
                setSchema(buildSchema(sdl));
            } catch (error) {
                console.error("Error fetching and building schema:", error);
            }
        };

        fetchData();
    }, []);

    // const customValidationRules: ValidationRule[] = specifiedRules.filter(rule => rule == ScalarLeafsRule);
    // console.log("specifiedRules",specifiedRules,customValidationRules);

    // //   const validateSchema = (schema: GraphQLSchema, documentAST: any) => {
    // //     const errors = validate(schema, documentAST, specifiedRules.filter(rule => rule.name !== 'KnownTypeNamesRule'));
    // //     return errors;
    // //   };

    const ignoreUnknownTypeRule = (context:ValidationContext) => {
        return {
          NamedType(node:any) {
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

    return (
        <GraphiQL
            fetcher={async (graphQLParams) => {
                // Implement the fetcher to interact with your GraphQL endpoint
            }}
            dangerouslyAssumeSchemaIsValid
            schema={schema}
            validationRules={customValidationRules}
            schemaDescription={true}

        />
    );
};

export default GraphiQLPlayground;