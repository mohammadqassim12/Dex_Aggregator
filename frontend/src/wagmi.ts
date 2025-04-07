import { getDefaultConfig, Chain } from '@rainbow-me/rainbowkit';

const buildbear = {
    id: 25_097,
    name: 'Mainnet Fork',
    iconUrl: 'https://pbs.twimg.com/profile_images/1776327141015072768/I__OpXqD_400x400.jpg',
    iconBackground: '#fff',
    nativeCurrency: { name: 'BuildBear', symbol: 'BBT', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://rpc.buildbear.io/active-jubilee-2923109c'] },
    },
    blockExplorers: {
        default: { name: 'BuildBear Explorer', url: 'https://explorer.buildbear.io/active-jubilee-2923109c' },
    },
    contracts: {
    },
} as const satisfies Chain;

export const config = getDefaultConfig({
    appName: 'Aggie',
    projectId: '1',
    chains: [buildbear],
});
