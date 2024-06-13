import axios from 'axios';

const URL = 'http://15.185.193.197:4026/api';

export const fetchApiDocs = async (url: string) => {
  const response = await axios.get(url || URL);
  return response.data;
};

export const fetchUnknownType = async (type:string, name:string) => {
    const response = await fetch(URL, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ t: type, n: name }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch unknown type');
    }
    
    const data = await response.json();
    return data;
  };