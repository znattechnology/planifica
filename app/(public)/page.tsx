import Link from 'next/link';
import { APP_NAME } from '@/src/shared/constants/app.constants';
import { ROUTES } from '@/src/shared/constants/routes.constants';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <h1 className="text-5xl font-bold text-blue-600">{APP_NAME}</h1>
      <p className="mt-4 text-xl text-gray-600">
        Sistema inteligente de geracao de planos de aula
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href={ROUTES.LOGIN}
          className="rounded-md bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
        >
          Entrar
        </Link>
        <Link
          href={ROUTES.REGISTER}
          className="rounded-md border border-blue-600 px-6 py-3 text-blue-600 hover:bg-blue-50"
        >
          Criar Conta
        </Link>
      </div>
    </div>
  );
}
