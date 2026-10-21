import { ALab } from '../../../../components/proto/a/lab';
import { protoParts } from '../../../../components/proto/data';

export const metadata = { title: 'A · Training bay' };
export default function Page() { return <ALab parts={protoParts()} />; }
