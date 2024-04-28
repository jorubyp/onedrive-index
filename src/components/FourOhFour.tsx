const FourOhFour: React.FC<{ code?: number, message: string }> = ({ code = 500, message: message }) => {
  if (code === 404) message = "Not found"
  return (
    <div className="text-center my-12">
      <div className="mx-auto mt-6 max-w-xl text-gray-500">
        <div className="mb-2 text-xl font-bold">
          {code}
        </div>
        <div className="text-sm">
          {message}
        </div>
      </div>
    </div>
  )
}

export default FourOhFour
