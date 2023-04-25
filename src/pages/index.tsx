import React, { useCallback } from "react";
import styles from "@/styles/Home.module.css";
import axios from "axios";
import MaterialTable from "material-react-table";
import MaterialReactTable from "material-react-table";

type ApiResponse = {
  [key: string]: string;
};

const handleResponseFromApi = (response: ApiResponse) => {
  Object.keys(response).forEach((key) => {
    response[key] = JSON.parse(response[key]);
  });

  return response;
};

export default function Home() {
  const [data, setData] = React.useState({ semrush: [] });
  const [isFetching, setIsFetching] = React.useState(null);
  const [totalFetched, setTotalFetched] = React.useState(0);
  const [totalDBRowCount, setTotalDBRowCount] = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(0);

  const tableContainerRef = React.useRef(null);
  const datasetKey = "semrush";
  const perPage = 20;

  const getRowsNumber = async () => {
    const url = "/api/holistic-search";
    // this table is actually 50k rows
    const sqlQuery = {
      [datasetKey]:
        "SELECT COUNT(*) as row_count FROM `upwork-384816.semrush.testing`",
    };
    const response = await axios.post(url, { queries: sqlQuery });
    const cleanedData = handleResponseFromApi(response.data);
    console.log("cleanedData", cleanedData);
    const totalNumber = +cleanedData.semrush[0].row_count;
    setTotalDBRowCount(totalNumber);
    console.log("totalNumber", totalNumber);
  };

  const getData = async () => {
    console.log("currentPage", currentPage);
    console.log("totalFetched", totalFetched);

    setIsFetching(true);
    const url = "/api/holistic-search";
    // this table is actually 50k rows
    const sqlQuery = {
      [datasetKey]:
        "SELECT URL, Keyword, Search_Volume FROM `upwork-384816.semrush.testing` LIMIT " +
        perPage +
        " Offset " +
        currentPage * perPage,
    };
    const response = await axios.post(url, { queries: sqlQuery });
    const cleanedData = handleResponseFromApi(response.data);
    setData((oldData) => {
      return { semrush: [...oldData["semrush"], ...cleanedData["semrush"]] };
    });
    //setData(cleanedData);
    setIsFetching(false);
    setTotalFetched((currentPage + 1) * perPage);
    setCurrentPage(currentPage + 1);
  };

  //called on scroll and possibly on mount to fetch more data as the user scrolls and reaches bottom of table
  const fetchMoreOnBottomReached = useCallback(
    (containerRefElement) => {
      if (containerRefElement) {
        const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
        //once the user has scrolled within 400px of the bottom of the table, fetch more data if we can
        if (
          scrollHeight - scrollTop - clientHeight < 400 &&
          !isFetching &&
          totalFetched < totalDBRowCount
        ) {
          getData();
        }
      }
    },
    //[fetchNextPage, isFetching, totalFetched, totalDBRowCount]
    [isFetching, totalFetched, totalDBRowCount]
  );

  console.log("data", data);

  // data has structure of { [table_name]: { [key: string]: value }[] }
  // get the 1st item in [key: string]: value }[] and get the keys for the columns
  const multiDatasetColumns =
    data &&
    data[datasetKey].length > 0 &&
    Object.keys(data).map((table_name) => {
      if (table_name === datasetKey) {
        const firstItem = data[table_name][0];
        const columns = Object.keys(firstItem).map((key) => {
          return {
            header: key,
            accessorKey: key,
          };
        });
        return columns;
      }
    });

  const columns = multiDatasetColumns && multiDatasetColumns[0];

  return (
    <>
      <main className={`${styles.main}`}>
        <div>
          <button
            onClick={() => {
              getData();
              getRowsNumber();
            }}
          >
            Fetch Data
          </button>
          {/* {data && <MaterialTable columns={columns} data={data[datasetKey]} />} */}
          {data && data[datasetKey].length > 0 && (
            <MaterialReactTable
              columns={columns}
              data={data[datasetKey]}
              enablePagination={false}
              enableRowVirtualization={true}
              muiTableContainerProps={{
                ref: tableContainerRef, //get access to the table container element
                sx: { maxHeight: "600px" }, //give the table a max height
                onScroll: (
                  event //add an event listener to the table container element
                ) => fetchMoreOnBottomReached(event.target),
              }}
            />
          )}
        </div>
      </main>
    </>
  );
}
