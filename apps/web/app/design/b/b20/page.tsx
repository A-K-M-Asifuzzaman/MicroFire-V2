import { BB20 } from '../../../../components/proto/b/b20';
import { protoB20 } from '../../../../components/proto/data';

export const metadata = { title: 'B · B20 record' };
export default function Page() { return <BB20 b={protoB20()} />; }
