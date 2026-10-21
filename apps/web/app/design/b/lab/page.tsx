import { BLab } from '../../../../components/proto/b/lab';
import { protoParts } from '../../../../components/proto/data';

export const metadata = { title: 'B · Training bay' };
export default function Page() { return <BLab parts={protoParts()} />; }
