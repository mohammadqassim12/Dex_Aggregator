import { getDefaultConfig, Chain } from '@rainbow-me/rainbowkit';
import { AppConfig } from './config' 

const buildbear = {
    id: AppConfig.id,
    name: 'Mainnet Fork',
    iconUrl: 'https://pbs.twimg.com/profile_images/1776327141015072768/I__OpXqD_400x400.jpg',
    iconBackground: '#fff',
    nativeCurrency: { name: 'BuildBear', symbol: 'BBT', decimals: 18 },
    rpcUrls: {
        default: { http: [AppConfig.apiUrl] },
    },
    blockExplorers: {
        default: { name: 'BuildBear Explorer', url: 'https://explorer.buildbear.io/conservative-psylocke-3187ddff' },
    },
    contracts: {
    },
} as const satisfies Chain;

export const config = getDefaultConfig({
    appName: 'Aggie',
    projectId: '1',
    chains: [buildbear],
});
