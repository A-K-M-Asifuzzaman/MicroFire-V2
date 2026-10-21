import { AB20 } from '../../../../components/proto/a/b20';
import { protoB20 } from '../../../../components/proto/data';

export const metadata = { title: 'A · B20 record' };
export default function Page() { return <AB20 b={protoB20()} />; }
