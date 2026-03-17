import { NextResponse } from 'next/server';

export const API_SUCCESS_CODE = 0;

export type ApiEnvelope<T> = {
  code: number;
  message: string;
  data: T;
};

export function successResponse<T>(
  data: T,
  message = '请求成功',
  init?: ResponseInit
) {
  return NextResponse.json<ApiEnvelope<T>>(
    {
      code: API_SUCCESS_CODE,
      message,
      data,
    },
    init
  );
}

export function errorResponse(
  message: string,
  status = 400,
  data: null = null
) {
  return NextResponse.json<ApiEnvelope<null>>(
    {
      code: status,
      message,
      data,
    },
    { status }
  );
}
