'use server';

import { z } from 'zod';
import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

const prisma = new PrismaClient();

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce.number().gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});
 
const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export type State = {
    errors?: {
      customerId?: string[];
      amount?: string[];
      status?: string[];
    };
    message?: string | null;
  };

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
try {
    await signIn('credentials', formData);
    } catch (error) {
        if (error instanceof AuthError) {
        switch (error.type) {
            case 'CredentialsSignin':
            return 'Invalid credentials.';
            default:
            return 'Something went wrong.';
        }
        }
        throw error;
    }
}

export async function createInvoice(prevState: State, formData: FormData) {
    const validatedFields = CreateInvoice.safeParse({
      customerId: formData.get('customerId'),
      amount: formData.get('amount'),
      status: formData.get('status'),
    });

    // If form validation fails, return errors early. Otherwise, continue.
    if (!validatedFields.success) {
        return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Create Invoice.',
        };
    }

    // Prepare data for insertion into the database
    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];

    console.log(`${customerId}, ${amountInCents}, ${status}, ${date}`);
    try {
        await prisma.$queryRaw`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}::uuid, ${amountInCents}, '${status}', ${date}::date)`;
    } catch (error) {
    return {
      message: 'Database Error: Failed to Create Invoice.',
    };
  }
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
  }

  export async function updateInvoice(
    id: string,
    prevState: State,
    formData: FormData,
  ) {
    const validatedFields = UpdateInvoice.safeParse({
      customerId: formData.get('customerId'),
      amount: formData.get('amount'),
      status: formData.get('status'),
    });
   
    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Update Invoice.',
      };
    }
   
    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;
   
    try {
      await prisma.$queryRaw`
        UPDATE invoices
        SET customer_id = ${customerId}::uuid, amount = ${amountInCents}, status = ${status}
        WHERE id = ${id}::uuid
      `;
    } catch (error) {
      return { message: 'Database Error: Failed to Update Invoice.' };
    }
   
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
  }

export async function deleteInvoice(id: number) {
    // throw new Error('Failed to Delete Invoice');
    try {
        await prisma.$queryRaw`DELETE FROM invoices WHERE id = ${id}::uuid`;
        revalidatePath('/dashboard/invoices');
    } catch (error) {
        return { message: 'Database Error: Failed to Delete Invoice.' };
    }
}