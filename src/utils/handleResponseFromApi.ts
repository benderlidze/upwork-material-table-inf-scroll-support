type ApiResponse = {
    [key: string]: string
};

const handleResponseFromApi = ( response: ApiResponse ) => {
    Object.keys(response).forEach((key) => {
        response[key] = JSON.parse(response[key]);
    });

    return response;
};

export default handleResponseFromApi;