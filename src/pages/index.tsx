import React from 'react'
import styles from '@/styles/Home.module.css'
import axios from "axios";
import MaterialTable from 'material-react-table';

type ApiResponse = {
  [key: string]: string
};

const handleResponseFromApi = ( response: ApiResponse ) => {
  Object.keys(response).forEach((key) => {
      response[key] = JSON.parse(response[key]);
  });

  return response;
};


export default function Home() {
  const [data, setData] = React.useState(null);

  const datasetKey = "semrush"; 
  
  const getData = async () => {
    const url = '/api/holistic-search'
    // this table is actually 50k rows
    const sqlQuery = { 
      [datasetKey]: 'SELECT URL, Keyword, Search_Volume FROM `upwork-384816.semrush.testing` LIMIT 10' 
    }
    const response = await axios.post(url, { queries: sqlQuery }); 
    const cleanedData = handleResponseFromApi(response.data)
    setData(cleanedData);
  };

  console.log('data', data)

  // data has structure of { [table_name]: { [key: string]: value }[] }
  // get the 1st item in [key: string]: value }[] and get the keys for the columns
  const multiDatasetColumns = data && Object.keys(data).map((table_name) => {
    if (table_name === datasetKey) {
      const firstItem = data[table_name][0]
      const columns = Object.keys(firstItem).map((key) => {
        return {
          header: key,
          accessorKey: key
        }
      })
      return columns
    } 
  });

  const columns = multiDatasetColumns && multiDatasetColumns[0]

  return (
    <>
      <main className={`${styles.main}`}>
        <div>
          <button onClick={getData}>Fetch Data</button>
          {data && (
            <MaterialTable 
              columns={columns} 
              data={data[datasetKey]}
            />
          )}
        </div>
      </main>
    </>
  )
}
