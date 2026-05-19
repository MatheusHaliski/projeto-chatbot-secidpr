import { UsersController } from '@/app/backend/controllers/UsersController';
import { NextResponse } from 'next/server';

const usersController = new UsersController();

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await usersController.getById(id);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  return NextResponse.json(user);
}
