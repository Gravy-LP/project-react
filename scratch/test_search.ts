import { searchBookings } from '../src/lib/api';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  console.log('Searching for "Mario"...');
  const res = await searchBookings('Mario');
  console.log('Results:', JSON.stringify(res, null, 2));
}

test();
