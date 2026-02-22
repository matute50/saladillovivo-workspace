import localFont from 'next/font/local';

export const centuryGothic = localFont({
    src: [
        {
            path: '../../public/fonts/CenturyGothic.woff2',
            weight: '400',
            style: 'normal',
        },
        {
            path: '../../public/fonts/CenturyGothic.woff',
            weight: '400',
            style: 'normal',
        },
        {
            path: '../../public/fonts/fonnts.com-Century_Gothic_Pro_Bold.otf',
            weight: '700',
            style: 'normal',
        },
    ],
    variable: '--font-century-gothic',
    display: 'swap',
});
