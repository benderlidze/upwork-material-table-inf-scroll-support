import { NextApiRequest, NextApiResponse } from 'next';
import { BigQuery } from '@google-cloud/bigquery';

const projectId = 'upwork-384816'

// Max 4MB Response: https://vercel.com/docs/concepts/limits/overview#serverless-function-payload-size-limit

interface ExtendedNextApiRequest extends NextApiRequest {
    queries: {
        [key: string]: string | string[];
    };
}

const serviceAccount = JSON.parse(
    process.env.BQ_SERVICE_ACCOUNT_KEY as string
);

const bigquery = new BigQuery({
    projectId: projectId,
    credentials: {
        client_email: serviceAccount.client_email,
        private_key: serviceAccount.private_key,
    },
});

async function bqQueryJob(queryString: string, key: string) {
    const [job] = await bigquery.createQueryJob({
        query: queryString,
        location: 'US',
        useLegacySql: false,
        dryRun: false,
        // maxResults: 1000000,
    });

    const [rows] = await job.getQueryResults();

    return {
        key: rows.length ? key : null,
        dataRow: rows.length ? rows : null,
    };
}

function hasValueProperty(obj: unknown): obj is { value: unknown } {
    // check if row has syntax like { "value": "2023-03-30" }
    return typeof obj === 'object' && obj !== null && 'value' in obj;
}


export default async function holisticSearch(
    req: ExtendedNextApiRequest,
    res: NextApiResponse,
) {
    try {
        const { queries } = req.body;
        const queryTasks = Object.entries(queries).map(([key, query]) =>
            bqQueryJob(query, key),
        );

        const results = await Promise.all(queryTasks);

        const returnDictObj: Record<string, string> = results.reduce(
            (acc, { key, dataRow }) => {
                if (key && dataRow) {
                    const cleanedDf = dataRow.map((row, index) => {
                        // add id index to each row for MUI grid
                        return {
                            id: index + 1,
                            ...row,
                        };
                    }).map((row) => {
                        return Object.entries(row).reduce((cleanedRow, [colName, colVal]) => {
                            if (typeof colVal === 'number') {
                                cleanedRow[colName] = parseFloat(colVal.toFixed(2));
                            } else if (hasValueProperty(colVal)) {
                                cleanedRow[colName] = colVal.value;
                            } else {
                                cleanedRow[colName] = colVal;
                            }
                        return cleanedRow;
                    }, {});
                });
                acc[key] = JSON.stringify(cleanedDf);
            }
            return acc;
        }, {});

        const responseJson = JSON.stringify(returnDictObj);
        
        // // console log the size in mb 
        // const returnDictObjSize = Buffer.byteLength(responseJson, 'utf8') / (1024 * 1024);
        // console.log('returnDictObj size in MB: ', returnDictObjSize);

        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(responseJson);
    } catch (e: any) {
        console.error(e);
        res.status(500).send(e.message);
    }
};