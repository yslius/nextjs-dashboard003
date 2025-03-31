import bcrypt from 'bcrypt';
// import { db } from '@vercel/postgres';
import { PrismaClient } from '@prisma/client'
import { invoices, customers, revenue, users } from '../lib/placeholder-data';

const prisma = new PrismaClient();

async function seedUsers() {

  await prisma.$queryRaw`DROP TABLE IF EXISTS users;`;

  await prisma.$queryRaw`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`;
  await prisma.$queryRaw`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );
  `;

  const insertedUsers = await Promise.all(
    users.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      return prisma.$queryRaw`
        INSERT INTO users (id, name, email, password)
        VALUES (${user.id}::uuid, ${user.name}, ${user.email}, ${hashedPassword})
        ON CONFLICT (id) DO NOTHING;
      `;
    }),
  );

  return insertedUsers;
}

async function seedCustomers() {
  await prisma.$queryRaw`DROP TABLE IF EXISTS customers;`;

  await prisma.$queryRaw`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`;
  await prisma.$queryRaw`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      image_url VARCHAR(255) NOT NULL
    );
  `;

  const insertedCustomers = await Promise.all(
    customers.map(
      (customer) => prisma.$queryRaw`
        INSERT INTO customers (id, name, email, image_url)
        VALUES (${customer.id}::uuid, ${customer.name}, ${customer.email}, ${customer.image_url})
        ON CONFLICT (id) DO NOTHING;
      `,
    ),
  );

  return insertedCustomers;
}

async function seedInvoices() {
  await prisma.$queryRaw`DROP TABLE IF EXISTS invoices;`;

  await prisma.$queryRaw`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  await prisma.$queryRaw`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      customer_id UUID NOT NULL,
      amount INT NOT NULL,
      status VARCHAR(255) NOT NULL,
      date DATE NOT NULL
    );
  `;

  const insertedInvoices = await Promise.all(
    invoices.map(
      (invoice) => prisma.$queryRaw`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${invoice.customer_id}::uuid, ${invoice.amount}, ${invoice.status}, ${invoice.date}::date)
        ON CONFLICT (id) DO NOTHING;
      `,
    ),
  );

  return insertedInvoices;
}

async function seedRevenue() {

  await prisma.$queryRaw`DROP TABLE IF EXISTS revenue;`;

  await prisma.$queryRaw`
    CREATE TABLE IF NOT EXISTS revenue (
      month VARCHAR(4) NOT NULL UNIQUE,
      revenue INT NOT NULL
    );
  `;

  const insertedRevenue = await Promise.all(
    revenue.map(
      (rev) => prisma.$queryRaw`
        INSERT INTO revenue (month, revenue)
        VALUES (${rev.month}, ${rev.revenue})
        ON CONFLICT (month) DO NOTHING;
      `,
    ),
  );

  return insertedRevenue;
}

export async function GET() {
  // return Response.json({
  //   message:
  //     'Uncomment this file and remove this line. You can delete this file when you are finished.',
  // });
  try {
    // await prisma.$queryRaw`BEGIN`;
    await seedUsers();
    await seedCustomers();
    await seedInvoices();
    await seedRevenue();
    // await prisma.$queryRaw`COMMIT`;

    return Response.json({ message: 'Database seeded successfully' });
  } catch (error) {
    await prisma.$queryRaw`ROLLBACK`;
    return Response.json({ error }, { status: 500 });
  }
}
