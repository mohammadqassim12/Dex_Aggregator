import { ConnectButton } from '@rainbow-me/rainbowkit';
import logo from "../../public/logo.png";

export const TopNav = () => {
    return (
        <>
            <div className="flex flex-row p-4 justify-between">
                <div className='flex flex-row items-center'>
                    <img src={logo} alt="Logo" className="w-10 h-10" />
                    <div className="text-2xl font-bold text-white px-4">
                        Aggie
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <ConnectButton />
                </div>
            </div>
        </>
    );
};