const MOBILE_MODAL_SHELL = {
  wrapper: 'px-4 py-4 sm:px-6',
  backdrop: 'bg-emerald-950/20',
  header: 'border-b border-default-200 px-5 py-4 sm:px-6',
  body: 'px-5 py-5 sm:px-6 sm:py-6',
  footer: 'flex-col-reverse gap-2 border-t border-default-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-6',
} as const;

export const buildResponsiveModalClassNames = (baseClassName: string) => ({
  ...MOBILE_MODAL_SHELL,
  base: `w-full max-w-[calc(100vw-2rem)] ${baseClassName} sm:max-w-md`,
});

export const responsiveModalClassNames = buildResponsiveModalClassNames(
  '!bg-white border border-emerald-200 shadow-2xl'
);

export const responsiveErrorModalClassNames = buildResponsiveModalClassNames(
  '!bg-white border border-red-200 shadow-xl'
);

export const responsiveSuccessModalClassNames = buildResponsiveModalClassNames(
  '!bg-white border border-green-200 shadow-xl'
);
